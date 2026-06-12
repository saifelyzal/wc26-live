# MySQL setup

Set one of these in production:

- `MYSQL_URL=mysql://user:password@host:3306/database`
- `MYSQL_DATABASE_URL=mysql://user:password@host:3306/database`
- `DATABASE_URL=mysql://user:password@host:3306/database`

Or set discrete variables:

- `MYSQL_HOST`
- `MYSQL_PORT`
- `MYSQL_USER`
- `MYSQL_PASSWORD`
- `MYSQL_DATABASE`

The app initializes these tables automatically during each Next.js server
instance startup when MySQL is configured.

You can also initialize or verify manually:

```bash
curl -X POST https://wc26.nexusai.run/api/jobs/init-db \
  -H "Authorization: Bearer $RESULT_SYNC_SECRET"
```

Schedule this job:

```bash
curl -X POST https://wc26.nexusai.run/api/jobs/sync-results \
  -H "Authorization: Bearer $RESULT_SYNC_SECRET"
```

The same schema is in `docs/db/mysql-init.sql`.
