
# Contributing

## Adding alerting rule

If you don't have time to write a PR, just copy and paste some alerts into an issue. We will format it accordingly.

Rules are here: `_data/rules.yml`.

### Guidelines

Please ensure your pull request adheres to the following guidelines:

- Search previous suggestions before making a new one, as yours may be a duplicate.
- Keep descriptions short and simple, but descriptive.
- Description must be factual (the "what?") and should provide root cause suggestions (the "why?"), for faster resolution.
- Queries must be tested on latest exporter version.

## Improving Github page

### Run localy

```
gem install bundler
bundle install
jekyll serve
```

Or with Docker:

```
docker run --rm -it -p 4000:4000 -v $(pwd):/srv/jekyll jekyll/jekyll jekyll serve
```

Or with Docker-Compose:

```
docker-compose up -d
```
