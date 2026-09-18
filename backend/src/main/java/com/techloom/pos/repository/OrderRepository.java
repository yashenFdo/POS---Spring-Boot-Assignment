package com.techloom.pos.repository;

import com.techloom.pos.model.Order;
import com.techloom.pos.model.OrderStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;

public interface OrderRepository extends JpaRepository<Order, Long> {

    List<Order> findByStatusAndReservationExpiresAtBefore(OrderStatus status, Instant time);
}
