package com.techloom.pos.service;

import com.techloom.pos.dto.OrderItemRequest;
import com.techloom.pos.dto.OrderRequest;
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

import java.math.BigDecimal;
import java.util.List;

@Service
public class OrderService {

    private final OrderRepository orderRepository;
    private final ProductRepository productRepository;

    public OrderService(OrderRepository orderRepository, ProductRepository productRepository) {
        this.orderRepository = orderRepository;
        this.productRepository = productRepository;
    }

    public List<Order> getAllOrders() {
        return orderRepository.findAll();
    }

    public Order getOrderById(Long id) {
        return orderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with id: " + id));
    }

    @Transactional
    public Order createPendingOrder(OrderRequest orderRequest) {
        Order order = new Order();
        BigDecimal total = BigDecimal.ZERO;

        for (OrderItemRequest itemRequest : orderRequest.getItems()) {
            Product product = productRepository.findById(itemRequest.getProductId())
                    .orElseThrow(() -> new ResourceNotFoundException("Product not found with id: " + itemRequest.getProductId()));
            
            if (product.getAvailableStock() < itemRequest.getQuantity()) {
                throw new InvalidStateException("Insufficient stock for product: " + product.getName());
            }

            OrderItem orderItem = new OrderItem(order, product.getId(), itemRequest.getQuantity(), product.getPrice());
            order.addOrderItem(orderItem);

            total = total.add(product.getPrice().multiply(BigDecimal.valueOf(itemRequest.getQuantity())));
        }

        order.setTotalAmount(total);
        return orderRepository.save(order);
    }

    @Transactional
    public Order cancelOrder(Long id) {
        Order order = getOrderById(id);

        if (order.getStatus() == OrderStatus.PENDING) {
            order.setStatus(OrderStatus.CANCELLED);
        } else if (order.getStatus() == OrderStatus.RESERVED) {
            // Need to release stock
            for (OrderItem item : order.getOrderItems()) {
                Product product = productRepository.findByIdForUpdate(item.getProductId())
                        .orElseThrow(() -> new ResourceNotFoundException("Product not found with id: " + item.getProductId()));
                product.setAvailableStock(product.getAvailableStock() + item.getQuantity());
                productRepository.save(product);
            }
            order.setStatus(OrderStatus.CANCELLED);
            order.setReservationExpiresAt(null);
        } else {
            throw new InvalidStateException("Cannot cancel order from state: " + order.getStatus());
        }

        return orderRepository.save(order);
    }
}
