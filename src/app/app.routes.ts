import { Routes } from '@angular/router';
import { LayoutComponent } from './components/layout/layout.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { LoginComponent } from './pages/login/login.component';
import { PlansComponent } from './pages/plans/planscomponent/plans.component';
import { AddPlansComponent } from './pages/plans/add-plans/add-plans.component';
import { ResearchComponent } from './pages/research/researchcomponent/research.component';
import { ResearchArticleComponent } from './pages/research/research-article/research-article.component';
import { StaffComponent } from './pages/staff/staff/staff.component';
import { AddStaffComponent } from './pages/staff/add-staff/add-staff.component';
import { ProfileComponent } from './pages/staff/profile/profile.component';
import { AddResearchComponent } from './pages/research/researchcomponent/add-research/add-research.component';
import { AddArticleComponent } from './pages/research/research-article/add-article/add-article.component';


// ⭐️ เพิ่มการนำเข้าหน้า Training
import { TrainingComponent } from './pages/training/training.component'; 

export const routes: Routes = [
  // หน้า Login แยกออกมาต่างหาก (ไม่มี Sidebar)
  { path: 'login', component: LoginComponent },

  // โครงสร้างที่มี Sidebar (หน้าอื่นๆ ทั้งหมดให้มาใส่ข้างใน children)
  {
    path: '',
    component: LayoutComponent,
    children: [
      { path: 'dashboard', component: DashboardComponent },
      
      // หมวด Plans
      { path: 'plans', component: PlansComponent },
      { path: 'plans/add', component: AddPlansComponent },
      
      // หมวด Research
      { path: 'research', component: ResearchComponent },
      // ⭐️ แก้ไข Path ตรงนี้ให้เป็น 'research/add-research' เพื่อให้ตรงกับปุ่ม
      { path: 'research/add-research', component: AddResearchComponent }, 
      { path: 'research/article', component: ResearchArticleComponent }, 
      { path: 'research/article/add', component: AddArticleComponent },
      // หมวด Staff
      { path: 'staff', component: StaffComponent },
      { path: 'staff/add-staff', component: AddStaffComponent },
      { path: 'staff/profile', component: ProfileComponent },
      
      // หมวด Training
      { path: 'training', component: TrainingComponent },
      
      // Default Path
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },
  
  // ถ้าพิมพ์ path มั่วๆ หรือหาไม่เจอ ให้เด้งกลับไปหน้า login
  { path: '**', redirectTo: 'login' }
];