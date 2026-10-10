import { isValidRoomCode, SHOT_POWER, type ShotRequest } from '@pool/shared';

export interface ValidationResult {
  valid: boolean;
  reason?: string;
}

export function validateRoomCodeInput(code: unknown): ValidationResult {
  if (typeof code !== 'string' || !isValidRoomCode(code)) {
    return { valid: false, reason: 'O código da sala deve ter o formato 8B-XXXX.' };
  }
  return { valid: true };
}

export function validatePlayerName(name: unknown): ValidationResult {
  if (typeof name !== 'string' || name.trim().length === 0) {
    return { valid: false, reason: 'O nome do jogador é obrigatório.' };
  }
  if (name.length > 24) {
    return { valid: false, reason: 'O nome do jogador deve ter no máximo 24 caracteres.' };
  }
  return { valid: true };
}

/** Validates the shape and numeric bounds of a shot request from an untrusted client. */
export function validateShotRequest(shot: unknown): ValidationResult {
  if (typeof shot !== 'object' || shot === null) {
    return { valid: false, reason: 'Requisição de tacada inválida.' };
  }
  const s = shot as Partial<ShotRequest>;

  if (
    !s.direction ||
    typeof s.direction.x !== 'number' ||
    typeof s.direction.y !== 'number' ||
    !Number.isFinite(s.direction.x) ||
    !Number.isFinite(s.direction.y) ||
    (s.direction.x === 0 && s.direction.y === 0)
  ) {
    return { valid: false, reason: 'A direção da tacada deve ser um vetor finito diferente de zero.' };
  }

  if (typeof s.power !== 'number' || !Number.isFinite(s.power) || s.power < SHOT_POWER.MIN || s.power > SHOT_POWER.MAX) {
    return { valid: false, reason: `A força da tacada deve estar entre ${SHOT_POWER.MIN} e ${SHOT_POWER.MAX}.` };
  }

  if (s.cueBallPlacement) {
    const { x, y } = s.cueBallPlacement;
    if (typeof x !== 'number' || typeof y !== 'number' || !Number.isFinite(x) || !Number.isFinite(y)) {
      return { valid: false, reason: 'O posicionamento da bola branca deve ser um ponto finito.' };
    }
  }

  return { valid: true };
}
