package com.proyecto.electromarket.dto;

import java.time.Instant;

public record LoginResponse(String accessToken, Instant expiresAt, AuthUserResponse usuario) {
}
