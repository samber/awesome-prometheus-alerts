<style>
  ul {
    list-style: none;
  }
</style>

<div style="padding: 20px 20px 10px 20px; border: solid grey 1px; border-radius: 10px;">
  <h2 style="text-align:center;">⚠️ Caution ⚠️</h2>

  <p style="text-align:center;">
    Alert thresholds depend on nature of applications.
    <br>
    Some queries in this page may have arbitrary tolerance threshold.
    <br><br>
    Building an efficient and battle-tested monitoring platform takes time. 😉
  </p>
</div>

<br>
<br>

<h1></h1>

<ul>
  {% for group in site.data.rules.groups %}
  {% assign groupIndex = forloop.index %}
    {% for service in group.services %}
    {% assign serviceIndex = forloop.index %}
      {% for exporter in service.exporters %}
      {% assign nbrRules = exporter.rules | size %}
      <li>
        {% assign serviceId = service.name | replace: " ", "-" | downcase %}
        <h2 id="{{ serviceId }}">
          {{ groupIndex }}.
          {{ serviceIndex }}.
          {{ service.name }}
          {% if exporter.name %}:
          {% if exporter.doc_url %}
          <a href="{{ exporter.doc_url }}">
            {{ exporter.name }}
          </a>
          {% else %}
          {{ exporter.name }}
          {% endif %}
          {% endif %}

          {% if nbrRules > 0 %}
            <small style="font-size: 60%; vertical-align: middle; margin-left: 10px;">
              ({{ nbrRules }} rules)
            </small>
            <span class="clipboard-multiple" data-clipboard-target-id="group-{{ groupIndex }}-service-{{ serviceIndex }}">[copy all]</span>
          {% endif %}
        </h2>

        {% if nbrRules == 0 %}
  {% highlight javascript %}
  // @TODO: Please contribute => https://github.com/samber/awesome-prometheus-alerts 👋
  {% endhighlight %}
        {% endif %}

        <ul>
          {% for rule in exporter.rules %}
          {% assign ruleIndex = forloop.index %}
          {% assign comments = rule.comments | strip | newline_to_br | split: '<br />' %}
          <li>
            <h4>
              {{ groupIndex}}.{{ serviceIndex }}.{{ ruleIndex }}.
              {{ rule.name }}
            </h4>
            <details id="group-{{ groupIndex }}-service-{{ serviceIndex }}-rule-{{ ruleIndex }}" open="">
              <summary>
                {{ rule.description }}
                <span class="clipboard-single" data-clipboard-target-id="group-{{ groupIndex }}-service-{{ serviceIndex }}-rule-{{ ruleIndex }}" onclick="event.preventDefault();">[copy]</span>
              </summary>
              <p>
              {% assign ruleName = rule.name | split: ' ' %}
              {% capture ruleNameCamelcase %}{% for word in ruleName %}{{ word | capitalize }} {% endfor %}{% endcapture %}

  {% highlight yaml %}
  {% for comment in comments %}# {{ comment | strip }}
  {% endfor %}- alert: {{ ruleNameCamelcase | remove: ' ' }}
    expr: {{ rule.query }}
    for: 5m
    labels:
      severity: {{ rule.severity }}
    annotations:
      summary: {{ rule.name }} (instance {% raw %}{{ $labels.instance }}{% endraw %})
      description: {{ rule.description }}\n  VALUE = {% raw %}{{ $value }}{% endraw %}\n  LABELS: {% raw %}{{ $labels }}{% endraw %}

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
  {% endfor %}
</ul>
