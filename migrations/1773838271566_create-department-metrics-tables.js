exports.up = (pgm) => {
    // Canonical schemas are defined by SQL migrations 048/050/051.
    // Keep this JS migration as a no-op to avoid creating partial table shapes.
    pgm.sql('SELECT 1;');
};

exports.down = (_pgm) => {
    // No-op rollback: canonical SQL migrations own these tables.
};
