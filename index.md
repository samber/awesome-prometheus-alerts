
<style>
.center-image
{
    margin: 0 auto;
    display: block;
}
</style>

![Prometheus logo](assets/prometheus-logo.png){: .center-image }

<h2>
  AlertManager configuration
</h2>

<a href="/alertmanager">
  See here
</a>

<h2>
  Prometheus alerting rules
</h2>

<ul>
  {% for service in site.data.rules.services %}
  <li>
    <a href="/rules#{{ service.name | replace: " ", "-" | downcase }}">
      {{ service.name }}
    </a>
  </li>
  {% endfor %}
</ul>