package com.techloom.pos.repository;

import com.techloom.pos.model.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface ProductRepository extends JpaRepository<Product, Long> {

    // Native SQL uses plain FOR UPDATE which MariaDB/MySQL both support.
    // JPQL + @Lock(PESSIMISTIC_WRITE) generates 'FOR UPDATE OF alias'
    // which MariaDB does not support.
    @Query(value = "SELECT * FROM product WHERE id = :id FOR UPDATE", nativeQuery = true)
    Optional<Product> findByIdForUpdate(@Param("id") Long id);
}
