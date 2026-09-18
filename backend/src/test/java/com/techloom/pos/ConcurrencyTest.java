package com.techloom.pos;

import com.techloom.pos.dto.OrderItemRequest;
import com.techloom.pos.dto.OrderRequest;
import com.techloom.pos.model.Order;
import com.techloom.pos.model.OrderStatus;
import com.techloom.pos.model.Product;
import com.techloom.pos.repository.OrderRepository;
import com.techloom.pos.repository.ProductRepository;
import com.techloom.pos.service.CheckoutService;
import com.techloom.pos.service.OrderService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.testcontainers.containers.MySQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.assertEquals;

@SpringBootTest
@Testcontainers
public class ConcurrencyTest {

    @Container
    @ServiceConnection
    static MySQLContainer<?> mysql = new MySQLContainer<>("mysql:8.0")
            .withDatabaseName("pos_db");

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private OrderService orderService;

    @Autowired
    private CheckoutService checkoutService;

    private Long testProductId;

    @BeforeEach
    void setUp() {
        Product p = new Product("Test Item", new BigDecimal("10.00"), 5);
        p = productRepository.save(p);
        testProductId = p.getId();
    }

    @AfterEach
    void tearDown() {
        orderRepository.deleteAll();
        productRepository.deleteAll();
    }

    @Test
    void testConcurrentCheckout_NoOverselling() throws InterruptedException {
        int numberOfThreads = 50;
        ExecutorService executorService = Executors.newFixedThreadPool(numberOfThreads);
        CountDownLatch latch = new CountDownLatch(numberOfThreads);
        
        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger failureCount = new AtomicInteger(0);

        List<Order> pendingOrders = new ArrayList<>();
        
        // Prepare 50 pending orders first
        for (int i = 0; i < numberOfThreads; i++) {
            OrderRequest request = new OrderRequest();
            OrderItemRequest item = new OrderItemRequest();
            item.setProductId(testProductId);
            item.setQuantity(1);
            request.setItems(Collections.singletonList(item));
            Order order = orderService.createPendingOrder(request);
            pendingOrders.add(order);
        }

        // Fire 50 concurrent checkouts
        for (int i = 0; i < numberOfThreads; i++) {
            final Long orderId = pendingOrders.get(i).getId();
            final String idempotencyKey = UUID.randomUUID().toString();
            
            executorService.execute(() -> {
                try {
                    checkoutService.checkout(orderId, idempotencyKey);
                    successCount.incrementAndGet();
                } catch (Exception e) {
                    failureCount.incrementAndGet();
                } finally {
                    latch.countDown();
                }
            });
        }

        latch.await();

        Product updatedProduct = productRepository.findById(testProductId).orElseThrow();

        assertEquals(5, successCount.get(), "Only 5 checkouts should succeed");
        assertEquals(45, failureCount.get(), "45 checkouts should fail due to insufficient stock");
        assertEquals(0, updatedProduct.getAvailableStock(), "Available stock should be exactly 0, no negative stock");
    }
}
