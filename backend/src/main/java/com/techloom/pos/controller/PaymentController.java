package com.techloom.pos.controller;

import com.techloom.pos.dto.PaymentRequest;
import com.techloom.pos.dto.StandardResponse;
import com.techloom.pos.model.Payment;
import com.techloom.pos.service.PaymentService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/payments")
public class PaymentController {

    private final PaymentService paymentService;

    public PaymentController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    @PostMapping("/process")
    public ResponseEntity<StandardResponse> processPayment(
            @Valid @RequestBody PaymentRequest paymentRequest,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey) {
        Payment payment = paymentService.processPayment(paymentRequest, idempotencyKey);
        return ResponseEntity.ok(new StandardResponse(200, "Payment processed successfully!", payment));
    }
}
