package com.techloom.pos.job;

import com.techloom.pos.model.Order;
import com.techloom.pos.model.OrderItem;
import com.techloom.pos.model.OrderStatus;
import com.techloom.pos.model.Product;
import com.techloom.pos.repository.OrderRepository;
import com.techloom.pos.repository.ProductRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Component
public class ReservationExpiryJob {

    private static final Logger logger = LoggerFactory.getLogger(ReservationExpiryJob.class);

    private final OrderRepository orderRepository;
    private final ProductRepository productRepository;

    public ReservationExpiryJob(OrderRepository orderRepository, ProductRepository productRepository) {
        this.orderRepository = orderRepository;
        this.productRepository = productRepository;
    }

    @Scheduled(fixedRate = 30000) // Every 30 seconds
    @Transactional
    public void releaseExpiredReservations() {
        logger.info("Running Reservation Expiry Job");
        List<Order> expiredOrders = orderRepository.findByStatusAndReservationExpiresAtBefore(OrderStatus.RESERVED, Instant.now());

        for (Order order : expiredOrders) {
            logger.info("Expiring order id: {}", order.getId());
            for (OrderItem item : order.getOrderItems()) {
                // We use findByIdForUpdate here to lock the product rows
                productRepository.findByIdForUpdate(item.getProductId()).ifPresent(product -> {
                    product.setAvailableStock(product.getAvailableStock() + item.getQuantity());
                    productRepository.save(product);
                });
            }
            order.setStatus(OrderStatus.EXPIRED);
            order.setReservationExpiresAt(null);
            orderRepository.save(order);
        }
    }
}
