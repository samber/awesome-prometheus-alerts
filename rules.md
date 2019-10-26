<style>
  ul {
    list-style: none;
  }
</style>

{% highlight yaml %}
# prometheus.yml

global:
  scrape_interval:     15s
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
      severity: error
    annotations:
      summary: "Redis instance ($instance) down"
      description: "Whatever"

{% endhighlight %}

<ul>
  {% for service in site.data.rules.services %}
  {% assign serviceIndex = forloop.index %}
    {% for exporter in service.exporters %}
    {% assign nbrRules = exporter.rules | size %}
    <li>
      <h2 id="{{ service.name | replace: " ", "-" | downcase }}">
        {{ serviceIndex }}.
        {{ service.name }}
        {% if exporter.name %}
        :
        {% if exporter.doc_url %}
        <a href="{{ exporter.doc_url }}">
          {{ exporter.name }}
        </a>
        {% else %}
        {{ exporter.name }}
        {% endif %}
        {% endif %}

        {% if nbrRules > 0 %}
          <span class="clipboard-multiple" data-clipboard-target-id="service-{{ serviceIndex }}">[copy all]</span>
        {% endif %}
      </h2>

      {% if nbrRules == 0 %}
{% highlight javascript %}
// @TODO
{% endhighlight %}
      {% endif %}

      <ul>
        {% for rule in exporter.rules %}
        {% assign ruleIndex = forloop.index %}
        {% assign comments = rule.comments | strip | newline_to_br | split: '<br />' %}
        <li>
          <h4>
            {{ serviceIndex }}.{{ ruleIndex }}.
            {{ rule.name }}
             </h4>
          <details id="service-{{ serviceIndex }}-rule-{{ ruleIndex }}" {% if true || (serviceIndex == 1 && ruleIndex == 1) %} open {% endif %}>
            <summary>
              {{ rule.description }}
              <span class="clipboard-single" data-clipboard-target-id="service-{{ serviceIndex }}-rule-{{ ruleIndex }}" onclick="event.preventDefault();">[copy]</span>
            </summary>
            <p>
            {% assign ruleName = rule.name | split: ' ' %}
            {% capture ruleNameCamelcase %}{% for word in ruleName %}{{ word | capitalize }} {% endfor %}{% endcapture %}

{% highlight yaml %}
{% for comment in comments %}# {{ comment | strip }}
{% endfor %}
- alert: {{ ruleNameCamelcase | remove: ' ' }}
  expr: {{ rule.query }}
  for: 5m
  labels:
    severity: {{ rule.severity }}
  annotations:
    summary: "{{ rule.name }} (instance {% raw %}{{ $labels.instance }}{% endraw %})"
    description: "{{ rule.description }}\n  VALUE = {% raw %}{{ $value }}{% endraw %}\n  LABELS: {% raw %}{{ $labels }}{% endraw %}"

{% endhighlight %}

            </p>
          </details>
          <br/>
        </li>
        {% endfor %}
      </ul>

    <hr/>
    </li>
  {% endfor %}
  {% endfor %}
</ul>
