import type { MigrationInterface, QueryRunner } from "typeorm";

export class InitialFoundation1760788800000 implements MigrationInterface {
  name = "InitialFoundation1760788800000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE roles (
        id char(36) NOT NULL,
        name varchar(32) NOT NULL,
        description varchar(160) NULL,
        CONSTRAINT pk_roles PRIMARY KEY (id),
        CONSTRAINT uq_roles_name UNIQUE (name)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE users (
        id char(36) NOT NULL,
        email varchar(191) NOT NULL,
        password_hash varchar(255) NOT NULL,
        first_name varchar(80) NOT NULL,
        last_name varchar(80) NOT NULL,
        status enum('ACTIVE', 'PENDING', 'SUSPENDED') NOT NULL DEFAULT 'PENDING',
        email_verified_at datetime(3) NULL,
        version int unsigned NOT NULL DEFAULT 1,
        created_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        updated_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        CONSTRAINT pk_users PRIMARY KEY (id),
        CONSTRAINT uq_users_email UNIQUE (email)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE user_roles (
        user_id char(36) NOT NULL,
        role_id char(36) NOT NULL,
        CONSTRAINT pk_user_roles PRIMARY KEY (user_id, role_id),
        CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_user_roles_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    await queryRunner.query("CREATE INDEX idx_user_roles_role ON user_roles(role_id)");

    await queryRunner.query(`
      CREATE TABLE patient_profiles (
        id char(36) NOT NULL,
        user_id char(36) NOT NULL,
        phone varchar(32) NULL,
        date_of_birth date NULL,
        sex enum('FEMALE', 'MALE', 'OTHER', 'UNDISCLOSED') NOT NULL DEFAULT 'UNDISCLOSED',
        address varchar(500) NULL,
        created_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        updated_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        CONSTRAINT pk_patient_profiles PRIMARY KEY (id),
        CONSTRAINT uq_patient_profiles_user UNIQUE (user_id),
        CONSTRAINT fk_patient_profiles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE doctor_profiles (
        id char(36) NOT NULL,
        user_id char(36) NOT NULL,
        bmdc_number varchar(64) NOT NULL,
        degrees varchar(500) NULL,
        experience_years smallint unsigned NOT NULL DEFAULT 0,
        bio text NULL,
        application_status enum('DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'DRAFT',
        reviewed_at datetime(3) NULL,
        rejection_reason varchar(500) NULL,
        created_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        updated_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        CONSTRAINT pk_doctor_profiles PRIMARY KEY (id),
        CONSTRAINT uq_doctor_profiles_user UNIQUE (user_id),
        CONSTRAINT uq_doctor_profiles_bmdc UNIQUE (bmdc_number),
        CONSTRAINT fk_doctor_profiles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE specialties (
        id char(36) NOT NULL,
        name varchar(120) NOT NULL,
        slug varchar(140) NOT NULL,
        is_active boolean NOT NULL DEFAULT true,
        CONSTRAINT pk_specialties PRIMARY KEY (id),
        CONSTRAINT uq_specialties_name UNIQUE (name),
        CONSTRAINT uq_specialties_slug UNIQUE (slug)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE doctor_specialties (
        specialty_id char(36) NOT NULL,
        doctor_id char(36) NOT NULL,
        CONSTRAINT pk_doctor_specialties PRIMARY KEY (specialty_id, doctor_id),
        CONSTRAINT fk_doctor_specialties_specialty FOREIGN KEY (specialty_id) REFERENCES specialties(id) ON DELETE RESTRICT,
        CONSTRAINT fk_doctor_specialties_doctor FOREIGN KEY (doctor_id) REFERENCES doctor_profiles(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    await queryRunner.query("CREATE INDEX idx_doctor_specialties_doctor ON doctor_specialties(doctor_id)");

    await queryRunner.query(`
      CREATE TABLE hospitals (
        id char(36) NOT NULL,
        name varchar(180) NOT NULL,
        slug varchar(200) NOT NULL,
        area varchar(120) NOT NULL,
        address varchar(500) NOT NULL,
        is_active boolean NOT NULL DEFAULT true,
        CONSTRAINT pk_hospitals PRIMARY KEY (id),
        CONSTRAINT uq_hospitals_slug UNIQUE (slug)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    await queryRunner.query("CREATE INDEX idx_hospitals_area_active ON hospitals(area, is_active)");
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE hospitals");
    await queryRunner.query("DROP TABLE doctor_specialties");
    await queryRunner.query("DROP TABLE specialties");
    await queryRunner.query("DROP TABLE doctor_profiles");
    await queryRunner.query("DROP TABLE patient_profiles");
    await queryRunner.query("DROP TABLE user_roles");
    await queryRunner.query("DROP TABLE users");
    await queryRunner.query("DROP TABLE roles");
  }
}
