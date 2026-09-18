package com.techloom.pos.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Lob;
import java.time.Instant;

@Entity
public class IdempotencyRecord {

    @Id
    private String idempotencyKey;

    private int responseStatusCode;

    @Lob
    @Column(columnDefinition = "TEXT")
    private String responseBody;

    private Instant createdAt;

    public IdempotencyRecord() {
        this.createdAt = Instant.now();
    }

    public IdempotencyRecord(String idempotencyKey, int responseStatusCode, String responseBody) {
        this();
        this.idempotencyKey = idempotencyKey;
        this.responseStatusCode = responseStatusCode;
        this.responseBody = responseBody;
    }

    public String getIdempotencyKey() {
        return idempotencyKey;
    }

    public void setIdempotencyKey(String idempotencyKey) {
        this.idempotencyKey = idempotencyKey;
    }

    public int getResponseStatusCode() {
        return responseStatusCode;
    }

    public void setResponseStatusCode(int responseStatusCode) {
        this.responseStatusCode = responseStatusCode;
    }

    public String getResponseBody() {
        return responseBody;
    }

    public void setResponseBody(String responseBody) {
        this.responseBody = responseBody;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
