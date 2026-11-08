// Package rules validates shared Prometheus rule files.
//
// Validation is deliberately structural: a file is accepted when every YAML
// document in it is a Prometheus rule file or a PrometheusRule custom resource.
// PromQL errors are reported as issues instead of rejections, so rule files
// written for PromQL dialects (Loki LogQL, VictoriaMetrics MetricsQL, Helm
// templates) are still collected.
package rules

import (
	"bytes"
	"errors"
	"fmt"
	"io"
	"strings"

	"github.com/prometheus/prometheus/promql/parser"
	"go.yaml.in/yaml/v3"
)

// Format identifies the shape of a rule document.
type Format string

const (
	// FormatPrometheus is a plain Prometheus rule file (top-level `groups`).
	FormatPrometheus Format = "prometheus"
	// FormatPrometheusRuleCRD is a prometheus-operator PrometheusRule resource (`spec.groups`).
	FormatPrometheusRuleCRD Format = "prometheus-rule-crd"
)

// maxIssueMessageLength caps parser messages, which can echo large expressions.
const maxIssueMessageLength = 512

// ErrNotRuleFile is returned when a file is not made only of rule documents.
var ErrNotRuleFile = errors.New("not a rule file")

// Issue is a non-fatal problem found in an accepted file.
type Issue struct {
	// Document is the 1-based index of the YAML document holding the problem.
	Document int    `json:"document"`
	Group    string `json:"group,omitempty"`
	Rule     string `json:"rule,omitempty"`
	Message  string `json:"message"`
}

// Report summarizes an accepted rule file.
type Report struct {
	Documents      int      `json:"documents"`
	Formats        []Format `json:"formats"`
	Groups         int      `json:"groups"`
	AlertingRules  int      `json:"alerting_rules"`
	RecordingRules int      `json:"recording_rules"`
	Issues         []Issue  `json:"issues,omitempty"`
}

// Rules returns the total number of alerting and recording rules.
func (r Report) Rules() int {
	return r.AlertingRules + r.RecordingRules
}

type ruleGroup struct {
	Name  string `yaml:"name"`
	Rules []rule `yaml:"rules"`
}

type rule struct {
	Alert  string `yaml:"alert"`
	Record string `yaml:"record"`
	Expr   string `yaml:"expr"`
}

// Validator checks rule files. It is safe for concurrent use.
type Validator struct {
	parser parser.Parser
}

// NewValidator returns a Validator with every optional PromQL feature enabled,
// so that experimental syntax is not reported as an issue.
func NewValidator() *Validator {
	return &Validator{
		parser: parser.NewParser(parser.Options{
			EnableExperimentalFunctions: true,
			EnableBinopFillModifiers:    true,
			EnableUnquotedUTF8Names:     true,
		}),
	}
}

// Validate parses content and returns a report, or an error wrapping
// ErrNotRuleFile when the file must be rejected.
func (v *Validator) Validate(content []byte) (Report, error) {
	report := Report{}
	formats := map[Format]bool{}

	decoder := yaml.NewDecoder(bytes.NewReader(content))
	for index := 1; ; index++ {
		var doc yaml.Node
		err := decoder.Decode(&doc)
		if errors.Is(err, io.EOF) {
			break
		}
		if err != nil {
			return Report{}, fmt.Errorf("%w: invalid YAML: %s", ErrNotRuleFile, truncate(err.Error()))
		}
		if isEmptyDocument(&doc) {
			continue
		}

		report.Documents++
		format, groupsNode, err := locateGroups(&doc)
		if err != nil {
			return Report{}, fmt.Errorf("%w: document %d: %s", ErrNotRuleFile, index, err.Error())
		}
		formats[format] = true

		var groups []ruleGroup
		if err := groupsNode.Decode(&groups); err != nil {
			return Report{}, fmt.Errorf("%w: document %d: malformed groups: %s", ErrNotRuleFile, index, truncate(err.Error()))
		}
		v.inspectGroups(index, groups, &report)
	}

	if report.Rules() == 0 {
		return Report{}, fmt.Errorf("%w: no alerting or recording rule found", ErrNotRuleFile)
	}

	for _, format := range []Format{FormatPrometheus, FormatPrometheusRuleCRD} {
		if formats[format] {
			report.Formats = append(report.Formats, format)
		}
	}
	return report, nil
}

func (v *Validator) inspectGroups(document int, groups []ruleGroup, report *Report) {
	for _, group := range groups {
		report.Groups++
		if strings.TrimSpace(group.Name) == "" {
			report.Issues = append(report.Issues, Issue{Document: document, Message: "group has no name"})
		}

		for _, r := range group.Rules {
			issue := Issue{Document: document, Group: group.Name}
			switch {
			case r.Alert != "" && r.Record != "":
				report.Issues = append(report.Issues, withMessage(issue, r.Alert, "rule has both alert and record"))
				continue
			case r.Alert != "":
				report.AlertingRules++
				issue.Rule = r.Alert
			case r.Record != "":
				report.RecordingRules++
				issue.Rule = r.Record
			default:
				report.Issues = append(report.Issues, withMessage(issue, "", "rule has neither alert nor record"))
				continue
			}

			if strings.TrimSpace(r.Expr) == "" {
				report.Issues = append(report.Issues, withMessage(issue, issue.Rule, "rule has no expr"))
				continue
			}
			if _, err := v.parser.ParseExpr(r.Expr); err != nil {
				report.Issues = append(report.Issues, withMessage(issue, issue.Rule, "invalid PromQL: "+err.Error()))
			}
		}
	}
}

// locateGroups returns the `groups` sequence of a rule document.
func locateGroups(doc *yaml.Node) (Format, *yaml.Node, error) {
	root := doc
	if root.Kind == yaml.DocumentNode {
		root = root.Content[0]
	}
	if root.Kind != yaml.MappingNode {
		return "", nil, errors.New("top-level value is not a mapping")
	}

	format := FormatPrometheus
	container := root
	if kind := mappingValue(root, "kind"); kind != nil {
		if kind.Value != "PrometheusRule" {
			return "", nil, fmt.Errorf("unsupported kind %q", truncate(kind.Value))
		}
		format = FormatPrometheusRuleCRD
		container = mappingValue(root, "spec")
		if container == nil || container.Kind != yaml.MappingNode {
			return "", nil, errors.New("PrometheusRule has no spec mapping")
		}
	}

	groups := mappingValue(container, "groups")
	if groups == nil {
		return "", nil, errors.New("no groups key")
	}
	if groups.Kind != yaml.SequenceNode {
		return "", nil, errors.New("groups is not a list")
	}
	return format, groups, nil
}

func mappingValue(mapping *yaml.Node, key string) *yaml.Node {
	for i := 0; i+1 < len(mapping.Content); i += 2 {
		if mapping.Content[i].Value == key {
			return mapping.Content[i+1]
		}
	}
	return nil
}

func isEmptyDocument(doc *yaml.Node) bool {
	if doc.Kind != yaml.DocumentNode || len(doc.Content) == 0 {
		return true
	}
	content := doc.Content[0]
	return content.Kind == yaml.ScalarNode && content.Tag == "!!null"
}

func withMessage(issue Issue, ruleName string, message string) Issue {
	issue.Rule = ruleName
	issue.Message = truncate(message)
	return issue
}

func truncate(s string) string {
	if len(s) <= maxIssueMessageLength {
		return s
	}
	// Cutting at a byte offset may split a multi-byte rune; drop the fragment.
	return strings.ToValidUTF8(s[:maxIssueMessageLength], "") + "…"
}
