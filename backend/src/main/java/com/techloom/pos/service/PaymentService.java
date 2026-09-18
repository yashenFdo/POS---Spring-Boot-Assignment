package com.techloom.pos.service;

import com.techloom.pos.dto.PaymentRequest;
import com.techloom.pos.exception.InvalidStateException;
import com.techloom.pos.exception.ResourceNotFoundException;
import com.techloom.pos.model.Order;
import com.techloom.pos.model.OrderItem;
import com.techloom.pos.model.OrderStatus;
import com.techloom.pos.model.Payment;
import com.techloom.pos.model.PaymentOutcome;
import com.techloom.pos.model.Product;
import com.techloom.pos.repository.OrderRepository;
import com.techloom.pos.repository.PaymentRepository;
import com.techloom.pos.repository.ProductRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PaymentService {

    private final OrderRepository orderRepository;
    private final ProductRepository productRepository;
    private final PaymentRepository paymentRepository;

    public PaymentService(OrderRepository orderRepository, ProductRepository productRepository, PaymentRepository paymentRepository) {
        this.orderRepository = orderRepository;
        this.productRepository = productRepository;
        this.paymentRepository = paymentRepository;
    }

    @Transactional
    public Payment processPayment(PaymentRequest paymentRequest, String idempotencyKey) {
        Order order = orderRepository.findById(paymentRequest.getOrderId())
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with id: " + paymentRequest.getOrderId()));

        if (order.getStatus() != OrderStatus.RESERVED) {
            throw new InvalidStateException("Order must be in RESERVED state to process payment. Current state: " + order.getStatus());
        }

        Payment payment = new Payment(order.getId(), idempotencyKey, paymentRequest.getOutcome());
        paymentRepository.save(payment);

        if (paymentRequest.getOutcome() == PaymentOutcome.SUCCESS) {
            order.setStatus(OrderStatus.PAID);
            order.setReservationExpiresAt(null);
        } else if (paymentRequest.getOutcome() == PaymentOutcome.FAILURE || paymentRequest.getOutcome() == PaymentOutcome.TIMEOUT) {
            // Release stock
            for (OrderItem item : order.getOrderItems()) {
                Product product = productRepository.findByIdForUpdate(item.getProductId())
                        .orElseThrow(() -> new ResourceNotFoundException("Product not found with id: " + item.getProductId()));
                product.setAvailableStock(product.getAvailableStock() + item.getQuantity());
                productRepository.save(product);
            }
            order.setStatus(paymentRequest.getOutcome() == PaymentOutcome.FAILURE ? OrderStatus.FAILED : OrderStatus.EXPIRED);
            order.setReservationExpiresAt(null);
        }

        orderRepository.save(order);
        return payment;
    }
}
