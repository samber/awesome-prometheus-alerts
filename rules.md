<style>
  ul {
    list-style: none;
  }
</style>

<!-- CAUTIONS -->
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

<!-- RULES -->
<ul>
  {% for group in site.data.rules.groups %}
  {% assign groupIndex = forloop.index %}
    {% for service in group.services %}
    {% assign serviceIndex = forloop.index %}
    {% assign nbrExporters = service.exporters | size %}
      {% for exporter in service.exporters %}
      {% assign exporterIndex = forloop.index %}
      {% assign nbrRules = exporter.rules | size %}
      <li>
        {% assign serviceId = service.name | replace: " ", "-" | downcase %}
        <h2 id="{{ serviceId }}">
          <span id="{{ serviceId }}-{{ exporterIndex }}"></span>
          <a class="anchor" href="#{{ serviceId }}-{{ exporterIndex }}">#</a>
          {{ groupIndex }}.{{ serviceIndex }}.{% if nbrExporters > 1 %}{{ exporterIndex }}.{% endif %}
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
            <span class="clipboard-multiple" data-clipboard-target-id="group-{{ groupIndex }}-service-{{ serviceIndex }}-exporter-{{ exporterIndex }}">[copy section]</span>
          {% endif %}
        </h2>

        {% if nbrRules == 0 %}
{% highlight javascript %}
// @TODO: Please contribute => https://github.com/samber/awesome-prometheus-alerts 👋
{% endhighlight %}
        {% else %}
{{ exporter.comments | strip | newline_to_br }}
{% highlight bash %}
$ wget https://raw.githubusercontent.com/samber/awesome-prometheus-alerts/ref/head/dist/rules/{{ service.name | replace: " ", "-" | downcase }}/{{ exporter.slug }}.yml
{% endhighlight %}
        {% endif %}

        <ul>
          {% for rule in exporter.rules %}
          {% assign ruleIndex = forloop.index %}
          {% assign comments = rule.comments | strip | newline_to_br | split: '<br />' %}
          <li>
            <h4 id="rule-{{ serviceId }}-{{ exporterIndex }}-{{ ruleIndex }}">
              <span id="rule-{{ serviceId }}-{{ ruleIndex }}"></span><!-- @deprecated -->
              <a class="anchor" href="#rule-{{ serviceId }}-{{ exporterIndex }}-{{ ruleIndex }}">#</a>
              {{ groupIndex}}.{{ serviceIndex }}.{% if nbrExporters > 1 %}{{ exporterIndex }}.{% endif %}{{ ruleIndex }}.
              {{ rule.name }}
            </h4>
            <summary>
              {{ rule.description }}
              <span class="clipboard-single" data-clipboard-target-id="group-{{ groupIndex }}-service-{{ serviceIndex }}-exporter-{{ exporterIndex }}-rule-{{ ruleIndex }}" onclick="event.preventDefault();">[copy]</span>
            </summary>
            <div id="group-{{ groupIndex }}-service-{{ serviceIndex }}-exporter-{{ exporterIndex }}-rule-{{ ruleIndex }}">
              {% assign ruleName = rule.name | split: ' ' %}
              {% capture ruleNameCamelcase %}{% for word in ruleName %}{{ word | capitalize }} {% endfor %}{% endcapture %}

  {% highlight yaml %}
  {% for comment in comments %}# {{ comment | strip }}
  {% endfor %}- alert: {{ ruleNameCamelcase | remove: ' ' }}
    expr: {{ rule.query }}
    for: {% if rule.for %}{{ rule.for }}{% else %}0m{% endif %}
    labels:
      severity: {{ rule.severity }}
    annotations:
      summary: {{ rule.name }} (instance {% raw %}{{ $labels.instance }}{% endraw %})
      description: "{{ rule.description | replace: '"', '\"' }}\n  VALUE = {% raw %}{{ $value }}{% endraw %}\n  LABELS = {% raw %}{{ $labels }}{% endraw %}"

{% endhighlight %}

            </div>
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



<!-- NAVBAR -->
<div id="rules-navbar" class="affix">
  <h3>Menu</h3>
  <ul>
    {% for group in site.data.rules.groups %}
      <li>
        <h4>{{ group.name }}</h4>
        <ul>
          {% for service in group.services %}
            <li>
              <a href="#{{ service.name | replace: " ", "-" | downcase }}">
                👉 {{ service.name }}
              </a>
            </li>
          {% endfor %}
        </ul>
      </li>
    {% endfor %}
  </ul>

  <script>
    $('#rules-navbar').affix({offset: {top: 750} }).css('display', 'block');
  </script>
</div>
