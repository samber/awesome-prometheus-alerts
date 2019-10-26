
# Contributing

## Adding alerting rule

Rules are here: `_data/rules.yml`.

## Run localy

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

## Guidelines

Please ensure your pull request adheres to the following guidelines:

- Search previous suggestions before making a new one, as yours may be a duplicate.
- Keep descriptions short and simple, but descriptive.
- Queries must be tested on latest exporter version.
