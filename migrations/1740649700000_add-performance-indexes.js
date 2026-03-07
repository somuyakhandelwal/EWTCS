/* Performance Index Migration
 * Focuses on speeding up the main dashboard query (Epic 1 / Epic 13)
 */

exports.up = (pgm) => {
    // Index for active beds to speed up dashboard filtering
    pgm.createIndex('beds', ['is_active', 'bed_number'], {
        name: 'idx_beds_active_number',
        where: 'is_active = true'
    });

    // Index for current_stage_id to speed up JOIN with stages
    pgm.createIndex('beds', 'current_stage_id', {
        name: 'idx_beds_current_stage'
    });

    // Index for unresolved disposition delay reasons
    // Speeds up the LATERAL JOIN in getBedsWithElapsedTime
    pgm.createIndex('disposition_delay_reasons', ['bed_id', 'resolved_at'], {
        name: 'idx_disposition_unresolved',
        where: 'resolved_at IS NULL'
    });

    // Index for stage delay thresholds to speed up delay calculations
    pgm.createIndex('stage_delay_thresholds', 'stage_id', {
        name: 'idx_stage_thresholds_lookup'
    });
};

exports.down = (pgm) => {
    pgm.dropIndex('beds', 'idx_beds_active_number');
    pgm.dropIndex('beds', 'idx_beds_current_stage');
    pgm.dropIndex('disposition_delay_reasons', 'idx_disposition_unresolved');
    pgm.dropIndex('stage_delay_thresholds', 'idx_stage_thresholds_lookup');
};
