package com.techloom.pos.controller;

import com.techloom.pos.dto.OrderRequest;
import com.techloom.pos.model.Order;
import com.techloom.pos.service.CheckoutService;
import com.techloom.pos.service.OrderService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
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
    public List<Order> getAllOrders() {
        return orderService.getAllOrders();
    }

    @GetMapping("/{id}")
    public Order getOrderById(@PathVariable Long id) {
        return orderService.getOrderById(id);
    }

    @PostMapping("/cart")
    @ResponseStatus(HttpStatus.CREATED)
    public Order createPendingOrder(@Valid @RequestBody OrderRequest orderRequest) {
        return orderService.createPendingOrder(orderRequest);
    }

    @PostMapping("/{id}/checkout")
    public Order checkoutOrder(@PathVariable Long id, @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey) {
        return checkoutService.checkout(id, idempotencyKey);
    }

    @PostMapping("/{id}/cancel")
    public Order cancelOrder(@PathVariable Long id) {
        return orderService.cancelOrder(id);
    }
}
