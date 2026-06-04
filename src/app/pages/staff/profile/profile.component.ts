import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // 👈 นำเข้า FormsModule

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule], // 👈 ใส่ FormsModule
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css'
})
export class ProfileComponent implements OnInit {
  isEditMode = false;
  isCurrentUser = true; // 👈 กำหนดว่าเป็นโปรไฟล์ตัวเอง (จะได้เห็นปุ่ม Edit)

  // ข้อมูลเดิมของคุณ นำมาใส่เป็นตัวแปรเพื่อให้แก้ไขได้
  userProfile = {
    fullName: 'แฮร์รี่ พอตเตอร์',
    email: 'harrypotter@siam.edu',
    studentId: 'XXXXXXXXXX',
    degree: 'ปริญญาตรี',
    major: 'ป้องกันตัวจากศาสตร์มืด',
    university: 'มหาวิทยาลัยฮอกวอตส์',
    gradYear: '1960',
    expertise: 'ดวลเวทมนตร์, ภาษาพาร์เซล, ป้องกันตัวจากศาสตร์มืด'
  };

  // ตัวแปรเก็บข้อมูลชั่วคราวตอนกด Edit
  editData = { ...this.userProfile };

  // ฟังก์ชันแยกคำความเชี่ยวชาญจากคอมม่า (,) ให้กลายเป็น Array เพื่อวนลูปทำป้าย Tag
  get expertiseArray() {
    return this.userProfile.expertise.split(',').map(item => item.trim()).filter(item => item !== '');
  }

  ngOnInit() {
    // โค้ดสำหรับเช็คสิทธิ์ในอนาคต เช่น ถ้าคนล็อกอิน ไม่ใช่เจ้าของหน้านี้ ให้ isCurrentUser = false
  }

  toggleEdit() {
    this.isEditMode = true;
    this.editData = { ...this.userProfile }; // ดึงค่าปัจจุบันมาใส่ฟอร์ม
  }

  cancelEdit() {
    this.isEditMode = false;
  }

  saveProfile() {
    this.userProfile = { ...this.editData }; // บันทึกทับข้อมูลเดิม
    this.isEditMode = false;
    alert('อัปเดตข้อมูลโปรไฟล์เรียบร้อยแล้ว!');
  }
}