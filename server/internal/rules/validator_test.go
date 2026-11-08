package rules

import (
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

const prometheusRuleFile = `
groups:
  - name: host
    rules:
      - alert: HostOutOfMemory
        expr: node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes < 0.1
        for: 2m
        labels:
          severity: warning
        annotations:
          description: "Memory is low on {{ $labels.instance }}"
      - record: instance:node_cpu:rate5m
        expr: sum by (instance) (rate(node_cpu_seconds_total{mode!="idle"}[5m]))
`

const prometheusRuleCRD = `
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: example
spec:
  groups:
    - name: example
      rules:
        - alert: ExampleDown
          expr: up{job="example"} == 0
`

func TestValidateAcceptsPrometheusRuleFile(t *testing.T) {
	report, err := NewValidator().Validate([]byte(prometheusRuleFile))

	require.NoError(t, err)
	assert.Equal(t, 1, report.Documents)
	assert.Equal(t, []Format{FormatPrometheus}, report.Formats)
	assert.Equal(t, 1, report.Groups)
	assert.Equal(t, 1, report.AlertingRules)
	assert.Equal(t, 1, report.RecordingRules)
	assert.Empty(t, report.Issues)
}

func TestValidateAcceptsMultiDocumentCRDs(t *testing.T) {
	content := "---\n" + prometheusRuleCRD + "\n---\n" + prometheusRuleFile + "\n---\n"

	report, err := NewValidator().Validate([]byte(content))

	require.NoError(t, err)
	assert.Equal(t, 2, report.Documents)
	assert.Equal(t, []Format{FormatPrometheus, FormatPrometheusRuleCRD}, report.Formats)
	assert.Equal(t, 2, report.Groups)
	assert.Equal(t, 2, report.AlertingRules)
	assert.Equal(t, 1, report.RecordingRules)
}

func TestValidateAnnotatesInvalidRules(t *testing.T) {
	content := `
groups:
  - rules:
      - alert: LokiErrors
        expr: sum(rate({app="api"} |= "error" [5m])) > 10
      - alert: Missing
      - expr: up == 0
      - alert: Both
        record: both
        expr: up
`
	report, err := NewValidator().Validate([]byte(content))

	require.NoError(t, err)
	assert.Equal(t, 2, report.AlertingRules)
	require.Len(t, report.Issues, 5)
	assert.Equal(t, "group has no name", report.Issues[0].Message)
	assert.Equal(t, "LokiErrors", report.Issues[1].Rule)
	assert.True(t, strings.HasPrefix(report.Issues[1].Message, "invalid PromQL: "), report.Issues[1].Message)
	assert.Equal(t, Issue{Document: 1, Rule: "Missing", Message: "rule has no expr"}, report.Issues[2])
	assert.Equal(t, "rule has neither alert nor record", report.Issues[3].Message)
	assert.Equal(t, "rule has both alert and record", report.Issues[4].Message)
}

func TestValidateAcceptsExperimentalPromQL(t *testing.T) {
	content := `
groups:
  - name: experimental
    rules:
      - record: top
        expr: limitk(3, sort_by_label(up, "instance"))
`
	report, err := NewValidator().Validate([]byte(content))

	require.NoError(t, err)
	assert.Empty(t, report.Issues)
}

func TestValidateRejectsNonRuleFiles(t *testing.T) {
	tests := map[string]struct {
		content string
		reason  string
	}{
		"prometheus config": {
			content: "global:\n  scrape_interval: 15s\nscrape_configs:\n  - job_name: x\n    basic_auth:\n      password: secret\n",
			reason:  "document 1: no groups key",
		},
		"secret mixed with a rule CRD": {
			content: prometheusRuleCRD + "\n---\napiVersion: v1\nkind: Secret\ndata:\n  token: c2VjcmV0\n",
			reason:  `document 2: unsupported kind "Secret"`,
		},
		"invalid yaml": {
			content: "groups: [\n",
			reason:  "invalid YAML",
		},
		"top-level list": {
			content: "- a\n- b\n",
			reason:  "top-level value is not a mapping",
		},
		"groups not a list": {
			content: "groups: foo\n",
			reason:  "groups is not a list",
		},
		"no rules": {
			content: "groups:\n  - name: empty\n    rules: []\n",
			reason:  "no alerting or recording rule found",
		},
		"empty file": {
			content: "",
			reason:  "no alerting or recording rule found",
		},
		"crd without spec": {
			content: "kind: PrometheusRule\nmetadata:\n  name: x\n",
			reason:  "PrometheusRule has no spec mapping",
		},
	}

	for name, tt := range tests {
		t.Run(name, func(t *testing.T) {
			_, err := NewValidator().Validate([]byte(tt.content))

			require.ErrorIs(t, err, ErrNotRuleFile)
			assert.Contains(t, err.Error(), tt.reason)
		})
	}
}

func TestTruncateKeepsValidUTF8(t *testing.T) {
	long := strings.Repeat("é", maxIssueMessageLength)

	got := truncate(long)

	assert.True(t, strings.HasSuffix(got, "…"))
	assert.NotContains(t, got, "�")
	assert.LessOrEqual(t, len(got), maxIssueMessageLength+len("…"))
}
