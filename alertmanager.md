
<h2>
  AlertManager configuration
</h2>

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
  group_interval: 5m

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
        severity: error|warning
      continue: true

    - receiver: "sms"
      group_wait: 10s
      match_re:
        severity: error
      continue: true

receivers:
  - name: "slack"
    slack_configs:
      - api_url: 'https://hooks.slack.com/services/XXXXXXXXX/XXXXXXXXX/xxxxxxxxxxxxxxxxxxxxxxxxxxx'
        send_resolved: true
        channel: 'monitoring'
        text: "{{ range .Alerts }}<!channel> {{ .Annotations.summary }}\n{{ .Annotations.description }}\n{{ end }}"

  - name: "sms"
    webhook_config:
      - url: http://a.b.c:8080/send/sms
        send_resolved: true

{% endraw %}
{% endhighlight %}
