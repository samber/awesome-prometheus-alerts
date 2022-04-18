
Since some rules can be duplicated (multiple exporters), I added a prefix to rule name.

Error:

```
$ promtool check rules test/rules.yml
Checking rules.yml
29 duplicate rule(s) found.
Metric: CassandraClientRequestReadFailure
Label(s):
        severity: critical

[...]

Might cause inconsistency while recording expressions.
```
