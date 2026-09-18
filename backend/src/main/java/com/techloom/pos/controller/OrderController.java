package com.techloom.pos.controller;

import com.techloom.pos.dto.OrderRequest;
import com.techloom.pos.dto.StandardResponse;
import com.techloom.pos.model.Order;
import com.techloom.pos.service.CheckoutService;
import com.techloom.pos.service.OrderService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/orders")
public class OrderController {

    private final OrderService orderService;
    private final CheckoutService checkoutService;

    public OrderController(OrderService orderService, CheckoutService checkoutService) {
        this.orderService = orderService;
        this.checkoutService = checkoutService;
    }

    @GetMapping
    public ResponseEntity<StandardResponse> getAllOrders() {
        List<Order> orders = orderService.getAllOrders();
        return ResponseEntity.ok(new StandardResponse(200, "Orders retrieved successfully!", orders));
    }

    @GetMapping("/{id}")
    public ResponseEntity<StandardResponse> getOrderById(@PathVariable Long id) {
        Order order = orderService.getOrderById(id);
        return ResponseEntity.ok(new StandardResponse(200, "Order found!", order));
    }

    @PostMapping("/cart")
    public ResponseEntity<StandardResponse> createPendingOrder(@Valid @RequestBody OrderRequest orderRequest) {
        Order order = orderService.createPendingOrder(orderRequest);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new StandardResponse(201, "Order created successfully!", order));
    }

    @PostMapping("/{id}/checkout")
    public ResponseEntity<StandardResponse> checkoutOrder(
            @PathVariable Long id,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey) {
        Order order = checkoutService.checkout(id, idempotencyKey);
        return ResponseEntity.ok(new StandardResponse(200, "Stock reserved! Proceed to payment.", order));
    }

    @PostMapping("/{id}/cancel")
    public ResponseEntity<StandardResponse> cancelOrder(@PathVariable Long id) {
        Order order = orderService.cancelOrder(id);
        return ResponseEntity.ok(new StandardResponse(200, "Order cancelled and stock released.", order));
    }
}
