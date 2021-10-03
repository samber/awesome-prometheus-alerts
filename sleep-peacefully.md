<h1 style="text-align: center;">
  Sleep Peacefully
</h1>

## Alerting time window

In some applications, load and activity can vary over the day/week/year.

In order to prevent alarm fatigue and busy pager, alerts can be disabled during a period of time (such as night or weekend).

Example:

- Weekday: `node_load5 > 10 and ON() (0 < day_of_week() < 6)`
- Day time: `node_load5 > 10 and ON() (8 < hour() < 18)`
- Exclude December: `node_load5 > 10 and ON() (month() != 12)`

## Advanced time windows and timezones

```yml
# rules.yml

- record: is_european_summer_time
  expr: |
      (vector(1) and (month() > 3 and month() < 10))
      or
      (vector(1) and (month() == 3 and (day_of_month() - day_of_week()) >= 25) and absent((day_of_month() >= 25) and (day_of_week() == 0)))
      or
      (vector(1) and (month() == 10 and (day_of_month() - day_of_week()) < 25) and absent((day_of_month() >= 25) and (day_of_week() == 0)))
      or
      (vector(1) and ((month() == 10 and hour() < 1) or (month() == 3 and hour() > 0)) and ((day_of_month() >= 25) and (day_of_week() == 0)))
      or
      vector(0)

- record: europe_london_time
  expr: time() + 3600 * is_european_summer_time
- record: europe_paris_time
  expr: time() + 3600 * (1 + is_european_summer_time)

- record: europe_london_hour
  expr: hour(europe_london_time)
- record: europe_paris_hour
  expr: hour(europe_paris_time)

- record: europe_london_weekday
  expr: 0 < day_of_week(europe_london_time) < 6
- record: europe_paris_weekday
  expr: 0 < day_of_week(europe_paris_time) < 6

- record: europe_london_daytime
  expr: 8 < europe_london_hour < 18
- record: europe_paris_daytime
  expr: 8 < europe_paris_hour < 18

# new year's day / xmas / labor day / all saints' day / ...
- record: europe_french_public_holidays
  expr: |
      (vector(1) and month(europe_paris_time) == 1 and day_of_month(europe_paris_time) == 1)
      or
      (vector(1) and month(europe_paris_time) == 12 and day_of_month(europe_paris_time) == 25)
      or
      (vector(1) and month(europe_paris_time) == 5 and day_of_month(europe_paris_time) == 1)
      or
      (vector(1) and month(europe_paris_time) == 11 and day_of_month(europe_paris_time) == 1)
      or
      vector(0)
```

```yml
# alerts.yml

- alert: HighLoadQuietDuringWeekendAndNight
  expr: node_load5 > 10 and ON() (europe_london_weekday and europe_paris_weekday)

- alert: HighLoadQuietDuringBackup
  expr: node_load5 > 10 and ON() absent(hour() == 2)

- alert: HighLoad
  expr: |
      node_load5 > 20 and ON() (europe_london_weekday and europe_paris_weekday)
      or
      node_load5 > 10
```

## Sources

- [https://medium.com/@tom.fawcett/time-of-day-based-notifications-with-prometheus-and-alertmanager-1bf7a23b7695](https://medium.com/@tom.fawcett/time-of-day-based-notifications-with-prometheus-and-alertmanager-1bf7a23b7695)
- [https://promcon.io/2019-munich/slides/improved-alerting-with-prometheus-and-alertmanager.pdf](https://promcon.io/2019-munich/slides/improved-alerting-with-prometheus-and-alertmanager.pdf)
