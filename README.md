# Awesome Prometheus alerting rules

(WIP)

## Todo

- Write full alert rules in yml files
- Make a small website with form for each rule, to build custom alerts (criticity, thresolds, instance...)

## Queries

### Prometheus internal

- `up == 0` // killed exporters

### node-exporter

Memory:

- `(node_memory_MemFree{} + node_memory_Cached{} + node_memory_Buffers{}) / node_memory_MemTotal{} * 100 < 5`

Network:

- `sum by (instance) (irate(node_network_transmit_bytes{}[2m])) / 1024 / 1024 > 100`
- `sum by (instance) (irate(node_network_receive_bytes{}[2m])) / 1024 / 1024 > 100`

Disk:

- `sum by (instance) (irate(node_disk_bytes_read{}[2m])) / 1024 / 1024 > 50`
- `sum by (instance) (irate(node_disk_bytes_written{}[2m])) / 1024 / 1024 > 50`
- `node_filesystem_free{mountpoint ="/rootfs"} / node_filesystem_size{mountpoint ="/rootfs"} * 100 < 10` // gb
- `node_filesystem_files_free{mountpoint ="/rootfs"} / node_filesystem_files{mountpoint ="/rootfs"} * 100` // inodes
- `rate(node_disk_read_time_ms{}[1m]) / rate(node_disk_reads_completed{}[1m]) > 100` // too much latency
- `rate(node_disk_write_time_ms{}[1m]) / rate(node_disk_writes_completed{}[1m]) > 100` // too much latency

CPU:

- `avg by (instance) (sum by (cpu) (rate(node_cpu{mode!="idle"}[2m]))) * 100 > 75`  // load
- `rate(node_context_switches{}[5m]) > 1000` // nbr context switch per second

### cAdvisor

- `time() - container_last_seen{} > 60` // get killed container

### Nginx

- `rate(nginx_http_requests_total{status=~"^4.."}[1m]) > 10`  // get 4xx http requests
- `rate(nginx_http_requests_total{status=~"^5.."}[1m]) > 10`  // get 5xx http requests

### Rabbitmq (kbudde/rabbitmq-exporter)

- `rabbitmq_up{} == 0`
- `rabbitmq_running{} >= 2`   // cluster
- `rabbitmq_partitions{} > 0` // cluster got partition :-(
- `rabbitmq_node_mem_used{} / rabbitmq_node_mem_limit{} * 100 > 90`   // too much ram used
- `rabbitmq_connectionsTotal{} > 1000`

- `rabbitmq_queue_messages_unacknowledged{queue="my-queue"} > 5`
- `rabbitmq_queue_messages_ready{queue="my-queue"} > 1000` // more consumers needed
- `time() - rabbitmq_queue_head_message_timestamp{queue="my-queue"} > 60` // takes more than 1min to consume messages
- `rabbitmq_queue_consumers{} == 0`  // no consumer on queue
- `rate(rabbitmq_exchange_messages_published_in_total{exchange="my-exchange"}[1m]) < 5`  // no activity on exchange

### PostgreSQL (wrouesnel/postgres_exporter)

- `pg_up{} == 0`
- `pg_replication_lag{} > 10` // more than 10s lag between master and slave
- `time() - pg_stat_user_tables_last_autovacuum{} > 60 * 60 * 24` // did not vaccum for 1 day
- `time() - pg_stat_user_tables_last_autoanalyze{} > 60 * 60 * 24` // did not analyse for 1 day
- `sum by (datname) (pg_stat_activity_count{datname!~"template.*|postgres"}) > 100` // too many connections
- `sum by (datname) (pg_stat_activity_count{datname!~"template.*|postgres"}) < 5` // connections number too small
- `rate(pg_stat_database_deadlocks{pg_stat_database_de}[1m]) > 0`

### Redis (oliver006/redis_exporter)

- `redis_up{} == 0`
- `time() - redis_rdb_last_save_timestamp_seconds{} > 60 * 60 * 24` // did not backup for 1 day
- `redis_memory_used_bytes{} / redis_total_system_memory_bytes{} * 100 > 90`
- `redis_connected_slaves{}`
- `delta(redis_connected_slaves{}[1m]) < 0`  // slaved killed
- `redis_connected_clients{} > 100` // too many connections
- `redis_connected_clients{} < 5` // connections number too small
- `increase(redis_rejected_connections_total{}[1m]) > 0` // rejected connections

### MySQL

### Elasticsearch

### Blackbox
