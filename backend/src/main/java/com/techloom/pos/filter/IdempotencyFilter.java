package com.techloom.pos.filter;

import com.techloom.pos.model.IdempotencyRecord;
import com.techloom.pos.repository.IdempotencyRecordRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.util.ContentCachingResponseWrapper;

import java.io.IOException;
import java.util.Optional;

@Component
public class IdempotencyFilter extends OncePerRequestFilter {

    private final IdempotencyRecordRepository idempotencyRecordRepository;

    public IdempotencyFilter(IdempotencyRecordRepository idempotencyRecordRepository) {
        this.idempotencyRecordRepository = idempotencyRecordRepository;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain) throws ServletException, IOException {
        String idempotencyKey = request.getHeader("Idempotency-Key");

        if (idempotencyKey == null || idempotencyKey.isEmpty()) {
            filterChain.doFilter(request, response);
            return;
        }

        // Only apply to POST requests (e.g. checkout, payment)
        if (!request.getMethod().equalsIgnoreCase("POST")) {
            filterChain.doFilter(request, response);
            return;
        }

        Optional<IdempotencyRecord> existingRecord = idempotencyRecordRepository.findById(idempotencyKey);
        if (existingRecord.isPresent()) {
            IdempotencyRecord record = existingRecord.get();
            response.setStatus(record.getResponseStatusCode());
            response.setContentType("application/json");
            response.getWriter().write(record.getResponseBody());
            return;
        }

        ContentCachingResponseWrapper responseWrapper = new ContentCachingResponseWrapper(response);
        filterChain.doFilter(request, responseWrapper);

        byte[] responseArray = responseWrapper.getContentAsByteArray();
        String responseBody = new String(responseArray, responseWrapper.getCharacterEncoding());
        
        IdempotencyRecord newRecord = new IdempotencyRecord(idempotencyKey, responseWrapper.getStatus(), responseBody);
        idempotencyRecordRepository.save(newRecord);

        responseWrapper.copyBodyToResponse();
    }
}
