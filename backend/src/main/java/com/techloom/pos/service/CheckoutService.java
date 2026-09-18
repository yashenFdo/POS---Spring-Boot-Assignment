package com.techloom.pos.service;

import com.techloom.pos.exception.InvalidStateException;
import com.techloom.pos.exception.ResourceNotFoundException;
import com.techloom.pos.model.Order;
import com.techloom.pos.model.OrderItem;
import com.techloom.pos.model.OrderStatus;
import com.techloom.pos.model.Product;
import com.techloom.pos.repository.OrderRepository;
import com.techloom.pos.repository.ProductRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

@Service
public class CheckoutService {

    private final OrderRepository orderRepository;
    private final ProductRepository productRepository;

    public CheckoutService(OrderRepository orderRepository, ProductRepository productRepository) {
        this.orderRepository = orderRepository;
        this.productRepository = productRepository;
    }

    @Transactional
    public Order checkout(Long orderId, String idempotencyKey) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with id: " + orderId));

        if (order.getStatus() != OrderStatus.PENDING) {
            throw new InvalidStateException("Order must be in PENDING state to checkout. Current state: " + order.getStatus());
        }

        order.setIdempotencyKey(idempotencyKey);

        for (OrderItem item : order.getOrderItems()) {
            Product product = productRepository.findByIdForUpdate(item.getProductId())
                    .orElseThrow(() -> new ResourceNotFoundException("Product not found with id: " + item.getProductId()));

            if (product.getAvailableStock() < item.getQuantity()) {
                throw new InvalidStateException("Insufficient stock for product: " + product.getName());
            }

            product.setAvailableStock(product.getAvailableStock() - item.getQuantity());
            productRepository.save(product);
        }

        order.setStatus(OrderStatus.RESERVED);
        order.setReservationExpiresAt(Instant.now().plus(5, ChronoUnit.MINUTES));

        return orderRepository.save(order);
    }
}
