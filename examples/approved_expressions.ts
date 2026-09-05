export type ApprovedExpression =
  | 'happy'
  | 'surprise'
  | 'concern'
  | 'anger'
  | 'fear'
  | 'really';

type ExpressionSpec = {
  command: string;
  intensity: number;
  durationSeconds?: number;
};

// These values are illustrative only. Calibrate on the assembled avatar.
const palette: Record<ApprovedExpression, ExpressionSpec> = {
  happy: { command: 'EXPR|HAPPY', intensity: 0.5, durationSeconds: 1.5 },
  surprise: { command: 'EXPR|SURPRISE', intensity: 0.5, durationSeconds: 1.5 },
  concern: { command: 'EXPR|SAD', intensity: 0.5, durationSeconds: 1.5 },
  anger: { command: 'EXPR|ANGER', intensity: 0.5, durationSeconds: 1.5 },
  fear: { command: 'EXPR|FEAR', intensity: 0.5, durationSeconds: 1.5 },
  really: { command: 'GESTURE|BROW_RIGHT', intensity: 0.5 },
};

export class ApprovedExpressionController {
  private suppressUntil = 0;
  private suppressGenericMoodForNextResponse = false;

  constructor(private readonly sendAvatarControl: (message: string) => void) {}
  trigger(expression: ApprovedExpression): boolean {
    if (Date.now() < this.suppressUntil) return false;
    const spec = palette[expression];
    this.suppressUntil = Date.now() + 900;
    this.suppressGenericMoodForNextResponse = true;

    const intensity = Math.max(0, Math.min(1, spec.intensity)).toFixed(2);
    const message = spec.durationSeconds === undefined
      ? `${spec.command}|${intensity}`
      : `${spec.command}|${intensity}|${spec.durationSeconds.toFixed(2)}`;

    this.sendAvatarControl(message);
    return true;
  }

  consumeGenericMoodBypass(): boolean {
    const bypass = this.suppressGenericMoodForNextResponse;
    this.suppressGenericMoodForNextResponse = false;
    return bypass;
  }
}

export const expressionTool = {
  type: 'function',
  name: 'desktop_expression',
  description: 'Apply one approved visible facial expression. Use sparingly.',
  parameters: {
    type: 'object',
    properties: {
      expression: {
        type: 'string',
        enum: ['happy', 'surprise', 'concern', 'anger', 'fear', 'really'],
      },
    },
    required: ['expression'],
    additionalProperties: false,
  },
};