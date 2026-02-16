const hexColorPattern = /^#[0-9A-Fa-f]{6}$/;
const uppercaseWordPattern = /^[A-Z]{2,5}$/;
const bedPrefixPattern = /^[A-Z]+$/;

export interface SeedConfig {
  hospital: {
    name: string;
    code: string;
  };
  beds: {
    prefix: string;
    start: number;
    end: number;
  };
  stages: Array<{
    id: number;
    name: string;
    description?: string;
    color: string;
    sequence: number;
  }>;
}

export class SeedValidator {
  validateSchema(config: unknown): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.isRecord(config)) {
      return { valid: false, errors: ["root: must be an object"] };
    }

    const hospital = config.hospital;
    if (!this.isRecord(hospital)) {
      errors.push("hospital: must be an object");
    } else {
      if (!this.isNonEmptyString(hospital.name)) {
        errors.push("hospital.name: must be a non-empty string");
      }
      if (!this.isMatchingString(hospital.code, uppercaseWordPattern)) {
        errors.push("hospital.code: must be 2-5 uppercase letters");
      }
    }

    const beds = config.beds;
    if (!this.isRecord(beds)) {
      errors.push("beds: must be an object");
    } else {
      if (!this.isMatchingString(beds.prefix, bedPrefixPattern)) {
        errors.push("beds.prefix: must be uppercase letters");
      }
      if (!this.isPositiveInteger(beds.start)) {
        errors.push("beds.start: must be a positive integer");
      }
      if (!this.isPositiveInteger(beds.end)) {
        errors.push("beds.end: must be a positive integer");
      }
    }

    const stages = config.stages;
    if (!Array.isArray(stages)) {
      errors.push("stages: must be an array");
    } else if (stages.length < 4) {
      errors.push("stages: must include at least 4 items");
    } else {
      stages.forEach((stage, index) => {
        if (!this.isRecord(stage)) {
          errors.push(`stages[${index}]: must be an object`);
          return;
        }
        if (!this.isPositiveInteger(stage.id)) {
          errors.push(`stages[${index}].id: must be a positive integer`);
        }
        if (!this.isNonEmptyString(stage.name)) {
          errors.push(`stages[${index}].name: must be a non-empty string`);
        }
        if (
          stage.description !== undefined &&
          stage.description !== null &&
          !this.isNonEmptyString(stage.description)
        ) {
          errors.push(`stages[${index}].description: must be a string`);
        }
        if (!this.isMatchingString(stage.color, hexColorPattern)) {
          errors.push(`stages[${index}].color: must be a hex color`);
        }
        if (!this.isPositiveInteger(stage.sequence)) {
          errors.push(`stages[${index}].sequence: must be a positive integer`);
        }
      });
    }

    return { valid: errors.length === 0, errors };
  }

  validateBusinessRules(config: SeedConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (config.beds.start > config.beds.end) {
      errors.push("Bed start number must be <= end number");
    }

    const numBeds = config.beds.end - config.beds.start + 1;
    if (numBeds > 200) {
      errors.push("Cannot seed more than 200 beds at once");
    }

    const stageNames = new Set<string>();
    const stageIds = new Set<number>();

    for (const stage of config.stages) {
      if (stageNames.has(stage.name)) {
        errors.push(`Duplicate stage name: "${stage.name}"`);
      }
      if (stageIds.has(stage.id)) {
        errors.push(`Duplicate stage id: ${stage.id}`);
      }
      stageNames.add(stage.name);
      stageIds.add(stage.id);
    }

    const sequences = config.stages
      .map((stage) => stage.sequence)
      .sort((a, b) => a - b);
    if (sequences.length > 0 && sequences[0] !== 1) {
      errors.push("Stage sequences must start at 1");
    }

    return { valid: errors.length === 0, errors };
  }

  validateAll(config: unknown): { valid: boolean; errors: string[] } {
    const schemaValidation = this.validateSchema(config);
    if (!schemaValidation.valid) {
      return schemaValidation;
    }

    return this.validateBusinessRules(config as SeedConfig);
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }

  private isNonEmptyString(value: unknown): value is string {
    return typeof value === "string" && value.trim().length > 0;
  }

  private isMatchingString(value: unknown, pattern: RegExp): value is string {
    return typeof value === "string" && pattern.test(value);
  }

  private isPositiveInteger(value: unknown): value is number {
    return (
      typeof value === "number" &&
      Number.isInteger(value) &&
      value > 0
    );
  }
}
