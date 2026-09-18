package com.techloom.pos.controller;

import com.techloom.pos.dto.PaymentRequest;
import com.techloom.pos.model.Payment;
import com.techloom.pos.service.PaymentService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/payments")
public class PaymentController {

    private final PaymentService paymentService;

    public PaymentController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    @PostMapping("/process")
    public Payment processPayment(@Valid @RequestBody PaymentRequest paymentRequest, @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey) {
        return paymentService.processPayment(paymentRequest, idempotencyKey);
    }
}
