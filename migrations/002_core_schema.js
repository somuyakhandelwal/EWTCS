exports.up = (pgm) => {
  pgm.createTable(
    'users',
    {
      id: { type: 'bigserial', primaryKey: true },
      email: { type: 'text', notNull: true, unique: true },
      password_hash: { type: 'text', notNull: true },
      display_name: { type: 'text' },
      role: { type: 'text', notNull: true },
      created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
      updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    },
    { ifNotExists: true }
  );

  pgm.addConstraint('users', 'users_role_check', {
    check: "role IN ('nurse', 'supervisor', 'admin')",
  });

  pgm.createTable(
    'beds',
    {
      id: { type: 'bigserial', primaryKey: true },
      bed_code: { type: 'text', notNull: true, unique: true },
      current_stage: { type: 'text', notNull: true },
      status_color: { type: 'text', notNull: true },
      active: { type: 'boolean', notNull: true, default: true },
      admitted_at: { type: 'timestamptz' },
      last_stage_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
      discharged_at: { type: 'timestamptz' },
      created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
      updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    },
    { ifNotExists: true }
  );

  pgm.addIndex('beds', ['active', 'status_color'], {
    name: 'beds_active_status_idx',
  });

  pgm.createTable(
    'stage_logs',
    {
      id: { type: 'bigserial', primaryKey: true },
      bed_id: {
        type: 'bigint',
        notNull: true,
        references: 'beds',
        onDelete: 'cascade',
      },
      stage: { type: 'text', notNull: true },
      changed_by: {
        type: 'bigint',
        references: 'users',
        onDelete: 'set null',
      },
      reason: { type: 'text' },
      changed_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    },
    { ifNotExists: true }
  );

  pgm.addIndex('stage_logs', ['bed_id', 'changed_at'], {
    name: 'stage_logs_bed_changed_idx',
  });

  pgm.createTable(
    'daily_reports',
    {
      id: { type: 'bigserial', primaryKey: true },
      report_date: { type: 'date', notNull: true, unique: true },
      total_patients: { type: 'integer', notNull: true, default: 0 },
      avg_time_minutes: { type: 'integer', notNull: true, default: 0 },
      delayed_count: { type: 'integer', notNull: true, default: 0 },
      ai_summary_text: { type: 'text' },
      generated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    },
    { ifNotExists: true }
  );

  pgm.addConstraint('daily_reports', 'daily_reports_counts_check', {
    check: 'total_patients >= 0 AND avg_time_minutes >= 0 AND delayed_count >= 0',
  });
};

exports.down = (pgm) => {
  pgm.dropTable('daily_reports', { ifExists: true });
  pgm.dropTable('stage_logs', { ifExists: true });
  pgm.dropTable('beds', { ifExists: true });
  pgm.dropTable('users', { ifExists: true });
};
