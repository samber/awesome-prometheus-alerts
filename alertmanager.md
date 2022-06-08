<h1 style="text-align: center;">
  Global configuration
</h1>

If you notice a delay between an event and the first notification, read the following blog post => [https://pracucci.com/prometheus-understanding-the-delays-on-alerting.html](https://pracucci.com/prometheus-understanding-the-delays-on-alerting.html).

## Prometheus configuration

{% highlight yaml %}
# prometheus.yml

global:
  scrape_interval: 20s

  # A short evaluation_interval will check alerting rules very often.
  # It can be costly if you run Prometheus with 100+ alerts.
  evaluation_interval: 20s
  ...

rule_files:
  - 'alerts/*.yml'

scrape_configs:
  ...

{% endhighlight %}

{% highlight yaml %}
# alerts/example-redis.yml

groups:

- name: ExampleRedisGroup
  rules:
  - alert: ExampleRedisDown
    expr: redis_up{} == 0
    for: 2m
    labels:
      severity: critical
    annotations:
      summary: "Redis instance down"
      description: "Whatever"

{% endhighlight %}

## AlertManager configuration

{% highlight yaml %}
{% raw %}
# alertmanager.yml

route:
  # When a new group of alerts is created by an incoming alert, wait at
  # least 'group_wait' to send the initial notification.
  # This way ensures that you get multiple alerts for the same group that start
  # firing shortly after another are batched together on the first
  # notification.
  group_wait: 10s

  # When the first notification was sent, wait 'group_interval' to send a batch
  # of new alerts that started firing for that group.
  group_interval: 30s

  # If an alert has successfully been sent, wait 'repeat_interval' to
  # resend them.
  repeat_interval: 30m

  # A default receiver
  receiver: "slack"

  # All the above attributes are inherited by all child routes and can
  # overwritten on each.
  routes:
    - receiver: "slack"
      group_wait: 10s
      match_re:
        severity: critical|warning
      continue: true

    - receiver: "pager"
      group_wait: 10s
      match_re:
        severity: critial
      continue: true

receivers:
  - name: "slack"
    slack_configs:
      - api_url: 'https://hooks.slack.com/services/XXXXXXXXX/XXXXXXXXX/xxxxxxxxxxxxxxxxxxxxxxxxxxx'
        send_resolved: true
        channel: 'monitoring'
        text: "{{ range .Alerts }}<!channel> {{ .Annotations.summary }}\n{{ .Annotations.description }}\n{{ end }}"

  - name: "pager"
    webhook_configs:
      - url: http://a.b.c.d:8080/send/sms
        send_resolved: true

{% endraw %}
{% endhighlight %}

## Reduce Prometheus server load

For expansive or frequent PromQL queries, Prometheus allows to precompute rules.

{% highlight yaml %}
{% raw %}
groups:

  # first define the recorded rule
  - name: ExampleRecordedGroup
    rules:
    - record: job:rabbitmq_queue_messages_delivered_total:rate:5m
      expr: rate(rabbitmq_queue_messages_delivered_total[5m])

  # then use it in alerts
  - name: ExampleAlertingGroup
    rules:
    - alert: ExampleRabbitmqLowMessageDelivery
      expr: sum(job:rabbitmq_queue_messages_delivered_total:rate:5m) < 10
      for: 2m
      labels:
        severity: critical
      annotations:
        summary: "Low delivery rate in Rabbitmq queues"
{% endraw %}
{% endhighlight %}

## Troubleshooting

If the notification takes too much time to be triggered, check the following delays:
- `scrape_interval = 20s` (prometheus.yml)
- `evaluation_interval = 20s` (prometheus.yml)
- `increase(mysql_global_status_slow_queries[1m]) > 0` (alerts/example-mysql.yml)
- `for: 5m` (alerts/example-mysql.yml)
- `group_wait = 10s` (alertmanager.yml)

Also read [https://pracucci.com/prometheus-understanding-the-delays-on-alerting.html](https://pracucci.com/prometheus-understanding-the-delays-on-alerting.html).
