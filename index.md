
<style>
.center-image
{
    margin: 0 auto;
    display: block;
}
</style>


![Prometheus logo](assets/prometheus-logo.png){: .center-image }


<h2>
  Hello world
</h2>

<a href="/alertmanager">
  AlertManager configuration
</a>

<a href="/sleep-peacefully">
  Alerting time window
</a>

<h2>
  Out of the box prometheus alerting rules
</h2>

<ul>
  {% for group in site.data.rules.groups %}
    <li style="margin-top: 30px;">
      {% assign nbrRules = 0 %}
      {% for service in group.services %}
        {% for exporter in service.exporters %}
          {% for rule in exporter.rules %}
            {% assign nbrRules = nbrRules | plus: 1 %}
          {% endfor %}
        {% endfor %}
      {% endfor %}

      <h3>{{ group.name }} <small style="margin-left: 20px;">({{ nbrRules }} rules)</small></h3>
      <ul>
        {% for service in group.services %}
        <li>
          <a href="/rules#{{ service.name | replace: " ", "-" | downcase }}">
            {{ service.name }}
          </a>
        </li>
        {% endfor %}
      </ul>
    </li>
  {% endfor %}
</ul>