CREATE DATABASE IF NOT EXISTS `absensi_db` CHARACTER SET utf8mb4;
USE `absensi_db`;

CREATE TABLE IF NOT EXISTS `users` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `username` VARCHAR(50) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` ENUM('admin','pegawai') NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `pegawai` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `nama_lengkap` VARCHAR(100) NOT NULL,
  `nip` VARCHAR(30) NULL,
  `departemen` VARCHAR(100) NULL,
  `status_aktif` TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `absen` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `pegawai_id` INT UNSIGNED NOT NULL,
  `tanggal` DATE NOT NULL,
  `jam_masuk` TIME NULL,
  `jam_pulang` TIME NULL,
  `status` ENUM('hadir','izin','alpa','terlambat') NOT NULL DEFAULT 'hadir',
  `menit_terlambat` INT NOT NULL DEFAULT 0,
  `keterangan` VARCHAR(200) NULL,
  `admin_id` INT UNSIGNED NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_pegawai_tanggal` (`pegawai_id`, `tanggal`),
  INDEX `idx_pegawai_tanggal` (`pegawai_id`, `tanggal`),
  FOREIGN KEY (`pegawai_id`) REFERENCES `pegawai` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
