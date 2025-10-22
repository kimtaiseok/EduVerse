package com.logicore.eduverse;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;

/**
 * EduVerse Learning Platform - Spring Boot Application
 *
 * 시네마틱 Python 학습 플랫폼의 백엔드 애플리케이션입니다.
 *
 * @version 2.0.0
 * @since 2025-01-01
 */
@SpringBootApplication
@EnableCaching
public class EduverseApplication {

    public static void main(String[] args) {
        SpringApplication.run(EduverseApplication.class, args);
    }
}
