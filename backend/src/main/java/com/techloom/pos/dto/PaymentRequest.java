package com.techloom.pos.dto;

import com.techloom.pos.model.PaymentOutcome;
import jakarta.validation.constraints.NotNull;

public class PaymentRequest {

    @NotNull
    private Long orderId;

    @NotNull
    private PaymentOutcome outcome;

    public Long getOrderId() {
        return orderId;
    }

    public void setOrderId(Long orderId) {
        this.orderId = orderId;
    }

    public PaymentOutcome getOutcome() {
        return outcome;
    }

    public void setOutcome(PaymentOutcome outcome) {
        this.outcome = outcome;
    }
}
