package com.techloom.pos.controller;

import com.techloom.pos.dto.StandardResponse;
import com.techloom.pos.model.Product;
import com.techloom.pos.service.ProductService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/products")
public class ProductController {

    private final ProductService productService;

    public ProductController(ProductService productService) {
        this.productService = productService;
    }

    @GetMapping
    public ResponseEntity<StandardResponse> getAllProducts() {
        List<Product> products = productService.getAllProducts();
        return ResponseEntity.ok(new StandardResponse(200, "Products retrieved successfully!", products));
    }

    @GetMapping("/{id}")
    public ResponseEntity<StandardResponse> getProductById(@PathVariable Long id) {
        Product product = productService.getProductById(id);
        return ResponseEntity.ok(new StandardResponse(200, "Product found!", product));
    }

    @PostMapping
    public ResponseEntity<StandardResponse> createProduct(@RequestBody Product product) {
        Product saved = productService.createProduct(product);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new StandardResponse(201, "New product added successfully!", saved));
    }

    @PutMapping("/{id}")
    public ResponseEntity<StandardResponse> updateProduct(@PathVariable Long id, @RequestBody Product product) {
        Product updated = productService.updateProduct(id, product);
        return ResponseEntity.ok(new StandardResponse(200, "Product updated successfully!", updated));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<StandardResponse> deleteProduct(@PathVariable Long id) {
        productService.deleteProduct(id);
        return ResponseEntity.ok(new StandardResponse(200, "Product deleted successfully!", null));
    }
}
