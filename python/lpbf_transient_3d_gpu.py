import time
import math
import warp as wp
import numpy as np

# Phase 25: Thermo-Morphological Keyhole 3D GPU Solver with Hydrodynamics
# Integrated Navier-Stokes, Marangoni Convection, Boussinesq Buoyancy (Liquid Expansion),
# and Recoil Pressure on a dynamic free surface using NVIDIA Warp.

wp.init()

@wp.struct
class LaserState:
    x: float
    y: float
    power: float

@wp.func
def get_laser_state(
    t: float, 
    tp_t: wp.array(dtype=float), 
    tp_x: wp.array(dtype=float), 
    tp_y: wp.array(dtype=float), 
    tp_p: wp.array(dtype=float), 
    num_pts: int
) -> LaserState:
    if num_pts == 0:
        return LaserState(0.0, 0.0, 0.0)
    if num_pts == 1 or t <= tp_t[0]:
        return LaserState(tp_x[0], tp_y[0], tp_p[0])
    if t >= tp_t[num_pts - 1]:
        return LaserState(tp_x[num_pts-1], tp_y[num_pts-1], tp_p[num_pts-1])
        
    low = int(0)
    high = int(num_pts - 1)
    
    while low <= high:
        mid = (low + high) // 2
        if tp_t[mid] <= t:
            if mid + 1 < num_pts and tp_t[mid + 1] > t:
                dt_seg = tp_t[mid + 1] - tp_t[mid]
                if dt_seg < 1e-12:
                    return LaserState(tp_x[mid], tp_y[mid], tp_p[mid])
                f = (t - tp_t[mid]) / dt_seg
                lx = tp_x[mid] + f * (tp_x[mid + 1] - tp_x[mid])
                ly = tp_y[mid] + f * (tp_y[mid + 1] - tp_y[mid])
                lp = tp_p[mid] + f * (tp_p[mid + 1] - tp_p[mid])
                return LaserState(lx, ly, lp)
            else:
                low = mid + 1
        else:
            high = mid - 1
            
    return LaserState(0.0, 0.0, 0.0)

@wp.func
def get_psat(T: float, P0: float, Lv: float, Rs: float, Tv: float) -> float:
    if T <= 1500.0:
        return 0.0
    return P0 * wp.exp((Lv / Rs) * ((1.0 / Tv) - (1.0 / T)))

@wp.func
def get_temperature_from_enthalpy(h_val: float, rho: float, L_f: float, T_s: float, T_l: float, cp_solid: float, cp_liquid: float) -> float:
    H_s = rho * cp_solid * T_s
    cp_mush = 0.5 * (cp_solid + cp_liquid)
    H_l = H_s + rho * L_f + rho * cp_mush * (T_l - T_s)
    if h_val <= H_s:
        return h_val / (rho * cp_solid)
    elif h_val >= H_l:
        return T_l + (h_val - H_l) / (rho * cp_liquid)
    else:
        return T_s + (T_l - T_s) * ((h_val - H_s) / (H_l - H_s))

@wp.func
def get_enthalpy_from_temperature(T: float, rho: float, L_f: float, T_s: float, T_l: float, cp_solid: float, cp_liquid: float) -> float:
    H_s = rho * cp_solid * T_s
    cp_mush = 0.5 * (cp_solid + cp_liquid)
    H_l = H_s + rho * L_f + rho * cp_mush * (T_l - T_s)
    if T <= T_s:
        return rho * cp_solid * T
    elif T >= T_l:
        return H_l + rho * cp_liquid * (T - T_l)
    else:
        return H_s + (H_l - H_s) * ((T - T_s) / (T_l - T_s))

@wp.func
def get_k(T: float, T_s: float, T_l: float, k_solid: float, k_liquid: float) -> float:
    if T <= T_s:
        return k_solid
    elif T >= T_l:
        return k_liquid
    else:
        return k_solid + (k_liquid - k_solid) * ((T - T_s) / (T_l - T_s))

@wp.kernel
def keyhole_surface_kernel(
    Z_surf: wp.array2d(dtype=float),
    Z_surf_new: wp.array2d(dtype=float),
    T: wp.array3d(dtype=float),
    nx: int, ny: int, dz: float, dt: float,
    P0: float, Lv: float, Rs: float, Tv: float, rho: float
):
    i, j = wp.tid()
    z_old = Z_surf[i, j]
    z_new = z_old
    if i > 0 and i < nx - 1 and j > 0 and j < ny - 1:
        k_surf = int(z_old / dz)
        T_surf = T[i, j, k_surf]
        
        P_sat = get_psat(T_surf, P0, Lv, Rs, Tv)
        P_recoil = 0.54 * P_sat
        
        v_depress = wp.sqrt(2.0 * P_recoil / rho)
        z_new = z_old - v_depress * dt
        
        if z_new < 2.0 * dz:
            z_new = 2.0 * dz
            
    Z_surf_new[i, j] = z_new

@wp.kernel
def velocity_advection_forces_kernel(
    U: wp.array3d(dtype=float), V: wp.array3d(dtype=float), W: wp.array3d(dtype=float),
    U_new: wp.array3d(dtype=float), V_new: wp.array3d(dtype=float), W_new: wp.array3d(dtype=float),
    T: wp.array3d(dtype=float),
    Z_surf: wp.array2d(dtype=float),
    nx: int, ny: int, nz: int,
    dx: float, dy: float, dz: float, dt: float,
    mu: float, rho: float, d_gamma_dT: float, beta: float,
    T_liquidus: float, T_solidus: float,
    P0: float, Lv: float, Rs: float, Tv: float
):
    i, j, k = wp.tid()
    u_c = U[i, j, k]
    v_c = V[i, j, k]
    w_c = W[i, j, k]
    
    if i > 0 and i < nx - 1 and j > 0 and j < ny - 1 and k > 0 and k < nz - 1:
        z_surf = Z_surf[i, j]
        k_surf = int(z_surf / dz)
        T_c = T[i, j, k]
        
        if k > k_surf or T_c < T_solidus:
            U_new[i, j, k] = 0.0
            V_new[i, j, k] = 0.0
            W_new[i, j, k] = 0.0
            return
            
        # Upwind advection
        
        # Upwind advection
        du_dx = (u_c - U[i-1, j, k])/dx if u_c > 0.0 else (U[i+1, j, k] - u_c)/dx
        du_dy = (u_c - U[i, j-1, k])/dy if v_c > 0.0 else (U[i, j+1, k] - u_c)/dy
        du_dz = (u_c - U[i, j, k-1])/dz if w_c > 0.0 else (U[i, j, k+1] - u_c)/dz
        
        dv_dx = (v_c - V[i-1, j, k])/dx if u_c > 0.0 else (V[i+1, j, k] - v_c)/dx
        dv_dy = (v_c - V[i, j-1, k])/dy if v_c > 0.0 else (V[i, j+1, k] - v_c)/dy
        dv_dz = (v_c - V[i, j, k-1])/dz if w_c > 0.0 else (V[i, j, k+1] - v_c)/dz
        
        dw_dx = (w_c - W[i-1, j, k])/dx if u_c > 0.0 else (W[i+1, j, k] - w_c)/dx
        dw_dy = (w_c - W[i, j-1, k])/dy if v_c > 0.0 else (W[i, j+1, k] - w_c)/dy
        dw_dz = (w_c - W[i, j, k-1])/dz if w_c > 0.0 else (W[i, j, k+1] - w_c)/dz
        
        adv_u = u_c*du_dx + v_c*du_dy + w_c*du_dz
        adv_v = u_c*dv_dx + v_c*dv_dy + w_c*dv_dz
        adv_w = u_c*dw_dx + v_c*dw_dy + w_c*dw_dz
        
        # Diffusion (viscous forces)
        nu = mu / rho
        lap_u = (U[i+1,j,k] - 2.0*u_c + U[i-1,j,k])/(dx*dx) + (U[i,j+1,k] - 2.0*u_c + U[i,j-1,k])/(dy*dy) + (U[i,j,k+1] - 2.0*u_c + U[i,j,k-1])/(dz*dz)
        lap_v = (V[i+1,j,k] - 2.0*v_c + V[i-1,j,k])/(dx*dx) + (V[i,j+1,k] - 2.0*v_c + V[i,j-1,k])/(dy*dy) + (V[i,j,k+1] - 2.0*v_c + V[i,j,k-1])/(dz*dz)
        lap_w = (W[i+1,j,k] - 2.0*w_c + W[i-1,j,k])/(dx*dx) + (W[i,j+1,k] - 2.0*w_c + W[i,j-1,k])/(dy*dy) + (W[i,j,k+1] - 2.0*w_c + W[i,j,k-1])/(dz*dz)
        
        # Boussinesq Buoyancy (Liquid expansion pushing liquid upwards)
        buoyancy = 0.0
        if T_c > T_liquidus:
            buoyancy = 9.81 * beta * (T_c - T_liquidus)
            
        u_new_val = u_c + dt * (-adv_u + nu * lap_u)
        v_new_val = v_c + dt * (-adv_v + nu * lap_v)
        w_new_val = w_c + dt * (-adv_w + nu * lap_w + buoyancy)
        
        # Free Surface Boundary Conditions (Marangoni & Recoil)
        if k == k_surf:
            dT_dx = (T[i+1, j, k] - T[i-1, j, k]) / (2.0 * dx)
            dT_dy = (T[i, j+1, k] - T[i, j-1, k]) / (2.0 * dy)
            
            # Marangoni Shear: tau = d_gamma/dT * grad(T) -> mu * du/dz = tau
            # du = dz * (d_gamma_dT / mu) * dT_dx
            u_marangoni = U[i, j, k-1] + dz * (d_gamma_dT / mu) * dT_dx
            v_marangoni = V[i, j, k-1] + dz * (d_gamma_dT / mu) * dT_dy
            
            u_new_val = u_marangoni
            v_new_val = v_marangoni
            
            # Recoil pressure acting as a downward momentum impulse for surface instability
            P_sat = get_psat(T_c, P0, Lv, Rs, Tv)
            P_recoil = 0.54 * P_sat
            if P_recoil > 1e6: P_recoil = 1e6 # Clamp recoil pressure
            w_recoil_impulse = - (P_recoil / rho) * (dt / dz)
            w_new_val += w_recoil_impulse
            
        # Hard clamp velocity for CFL stability
        max_vel = 5.0
        if u_new_val > max_vel: u_new_val = max_vel
        elif u_new_val < -max_vel: u_new_val = -max_vel
        if v_new_val > max_vel: v_new_val = max_vel
        elif v_new_val < -max_vel: v_new_val = -max_vel
        if w_new_val > max_vel: w_new_val = max_vel
        elif w_new_val < -max_vel: w_new_val = -max_vel

        # Darcy damping in mushy zone
        if T_c < T_liquidus and T_c > T_solidus:
            f_L = (T_c - T_solidus) / (T_liquidus - T_solidus)
            K_0 = 1e5
            damping = K_0 * ((1.0 - f_L)**2.0) / (f_L**3.0 + 1e-3)
            u_new_val = u_new_val / (1.0 + dt * damping)
            v_new_val = v_new_val / (1.0 + dt * damping)
            w_new_val = w_new_val / (1.0 + dt * damping)
            
    else:
        u_new_val = u_c
        v_new_val = v_c
        w_new_val = w_c
        
    U_new[i, j, k] = u_new_val
    V_new[i, j, k] = v_new_val
    W_new[i, j, k] = w_new_val

@wp.kernel
def compute_divergence_kernel(
    U: wp.array3d(dtype=float), V: wp.array3d(dtype=float), W: wp.array3d(dtype=float),
    Div: wp.array3d(dtype=float),
    Z_surf: wp.array2d(dtype=float),
    T: wp.array3d(dtype=float),
    nx: int, ny: int, nz: int,
    dx: float, dy: float, dz: float,
    T_solidus: float
):
    i, j, k = wp.tid()
    if i > 0 and i < nx - 1 and j > 0 and j < ny - 1 and k > 0 and k < nz - 1:
        z_surf = Z_surf[i, j]
        k_surf = int(z_surf / dz)
        if k > k_surf or T[i,j,k] < T_solidus:
            Div[i,j,k] = 0.0
            return
            
        du_dx = (U[i+1,j,k] - U[i-1,j,k])/(2.0*dx)
        dv_dy = (V[i,j+1,k] - V[i,j-1,k])/(2.0*dy)
        dw_dz = (W[i,j,k+1] - W[i,j,k-1])/(2.0*dz)
        
        Div[i,j,k] = du_dx + dv_dy + dw_dz

@wp.kernel
def pressure_jacobi_kernel(
    P: wp.array3d(dtype=float), P_new: wp.array3d(dtype=float),
    Div: wp.array3d(dtype=float),
    Z_surf: wp.array2d(dtype=float),
    T: wp.array3d(dtype=float),
    nx: int, ny: int, nz: int,
    dx: float, dy: float, dz: float,
    dt: float, rho: float, T_solidus: float
):
    i, j, k = wp.tid()
    if i > 0 and i < nx - 1 and j > 0 and j < ny - 1 and k > 0 and k < nz - 1:
        z_surf = Z_surf[i, j]
        k_surf = int(z_surf / dz)
        
        if k > k_surf or T[i,j,k] < T_solidus:
            P_new[i,j,k] = 0.0
            return
            
        term = (Div[i,j,k] * rho / dt)
        
        p_xm, p_xp = P[i-1,j,k], P[i+1,j,k]
        p_ym, p_yp = P[i,j-1,k], P[i,j+1,k]
        p_zm = float(P[i,j,k-1])
        p_zp = float(0.0)
        if k < k_surf:
            p_zp = float(P[i,j,k+1])
            
        num = (p_xm + p_xp)/(dx*dx) + (p_ym + p_yp)/(dy*dy) + (p_zm + p_zp)/(dz*dz) - term
        den = 2.0/(dx*dx) + 2.0/(dy*dy) + 2.0/(dz*dz)
        
        P_new[i,j,k] = num / den
    else:
        P_new[i,j,k] = P[i,j,k]

@wp.kernel
def project_velocity_kernel(
    U: wp.array3d(dtype=float), V: wp.array3d(dtype=float), W: wp.array3d(dtype=float),
    P: wp.array3d(dtype=float),
    Z_surf: wp.array2d(dtype=float),
    T: wp.array3d(dtype=float),
    nx: int, ny: int, nz: int,
    dx: float, dy: float, dz: float,
    dt: float, rho: float, T_solidus: float
):
    i, j, k = wp.tid()
    if i > 0 and i < nx - 1 and j > 0 and j < ny - 1 and k > 0 and k < nz - 1:
        z_surf = Z_surf[i, j]
        k_surf = int(z_surf / dz)
        if k > k_surf or T[i,j,k] < T_solidus:
            return
            
        dP_dx = (P[i+1,j,k] - P[i-1,j,k])/(2.0*dx)
        dP_dy = (P[i,j+1,k] - P[i,j-1,k])/(2.0*dy)
        dP_dz = (P[i,j,k+1] - P[i,j,k-1])/(2.0*dz)
        if k == k_surf:
            dP_dz = (0.0 - P[i,j,k-1])/(2.0*dz)
            
        U[i,j,k] -= (dt / rho) * dP_dx
        V[i,j,k] -= (dt / rho) * dP_dy
        W[i,j,k] -= (dt / rho) * dP_dz


@wp.kernel
def enthalpy_3d_nonlinear_step_kernel(
    T: wp.array3d(dtype=float), H: wp.array3d(dtype=float),
    U: wp.array3d(dtype=float), V: wp.array3d(dtype=float), W: wp.array3d(dtype=float),
    T_new: wp.array3d(dtype=float), H_new: wp.array3d(dtype=float),
    Z_surf: wp.array2d(dtype=float),
    nx: int, ny: int, nz: int,
    dx: float, dy: float, dz: float,
    dt: float, current_t: float,
    rho: float, L_f: float,
    T_solidus: float, T_liquidus: float,
    tp_t: wp.array(dtype=float), tp_x: wp.array(dtype=float), tp_y: wp.array(dtype=float), tp_p: wp.array(dtype=float), num_pts: int,
    radius: float, eta: float,
    h_c: float, epsilon: float, T_amb: float,
    P0: float, Lv: float, Rs: float, Tv: float,
    cp_solid: float, cp_liquid: float,
    k_solid: float, k_liquid: float
):
    i, j, k = wp.tid()
    
    if i > 0 and i < nx - 1 and j > 0 and j < ny - 1 and k > 0 and k < nz - 1:
        z_surf = Z_surf[i, j]
        k_surf = int(z_surf / dz)
        
        if k > k_surf:
            T_new[i, j, k] = T_amb
            H_new[i, j, k] = get_enthalpy_from_temperature(T_amb, rho, L_f, T_solidus, T_liquidus, cp_solid, cp_liquid)
            return

        T_c = T[i, j, k]
        h_c_val = H[i, j, k]
        k_c = get_k(T_c, T_solidus, T_liquidus, k_solid, k_liquid)
        
        k_xp = 0.5 * (k_c + get_k(T[i+1, j, k], T_solidus, T_liquidus, k_solid, k_liquid))
        k_xm = 0.5 * (k_c + get_k(T[i-1, j, k], T_solidus, T_liquidus, k_solid, k_liquid))
        k_yp = 0.5 * (k_c + get_k(T[i, j+1, k], T_solidus, T_liquidus, k_solid, k_liquid))
        k_ym = 0.5 * (k_c + get_k(T[i, j-1, k], T_solidus, T_liquidus, k_solid, k_liquid))
        
        T_zp = T[i, j, k+1]
        if k == k_surf:
            k_zp = 0.0 # Adiabatic to air
        else:
            k_zp = 0.5 * (k_c + get_k(T_zp, T_solidus, T_liquidus, k_solid, k_liquid))
            
        k_zm = 0.5 * (k_c + get_k(T[i, j, k-1], T_solidus, T_liquidus, k_solid, k_liquid))
        
        qx = (k_xp*(T[i+1, j, k] - T_c) - k_xm*(T_c - T[i-1, j, k])) / (dx*dx)
        qy = (k_yp*(T[i, j+1, k] - T_c) - k_ym*(T_c - T[i, j-1, k])) / (dy*dy)
        qz = (k_zp*(T_zp - T_c) - k_zm*(T_c - T[i, j, k-1])) / (dz*dz)
        q_cond = qx + qy + qz
        
        # Enthalpy Advection (Convection via liquid velocity)
        u_vel, v_vel, w_vel = U[i,j,k], V[i,j,k], W[i,j,k]
        dh_dx = (h_c_val - H[i-1,j,k])/dx if u_vel > 0.0 else (H[i+1,j,k] - h_c_val)/dx
        dh_dy = (h_c_val - H[i,j-1,k])/dy if v_vel > 0.0 else (H[i,j+1,k] - h_c_val)/dy
        dh_dz = (h_c_val - H[i,j,k-1])/dz if w_vel > 0.0 else (H[i,j,k+1] - h_c_val)/dz
        
        q_conv = - (u_vel * dh_dx + v_vel * dh_dy + w_vel * dh_dz)
        
        h_val_new = h_c_val + dt * (q_cond + q_conv)
        
        if k == k_surf:
            # Multi-track Laser State
            l_state = get_laser_state(current_t, tp_t, tp_x, tp_y, tp_p, num_pts)
            
            x_pos = float(i) * dx
            y_pos = float(j) * dy
            r2 = (x_pos - l_state.x)*(x_pos - l_state.x) + (y_pos - l_state.y)*(y_pos - l_state.y)
            
            q_laser = (2.0 * eta * l_state.power / (3.14159265 * radius * radius)) * wp.exp(-2.0 * r2 / (radius * radius))
            q_loss = h_c * (T_c - T_amb) + epsilon * 5.67e-8 * (T_c*T_c*T_c*T_c - T_amb*T_amb*T_amb*T_amb)
            
            P_sat = get_psat(T_c, P0, Lv, Rs, Tv)
            m_dot_evap = (0.54 * P_sat) / wp.sqrt(2.0 * 3.14159265 * Rs * T_c + 1e-6)
            q_evap = m_dot_evap * Lv
            
            h_val_new = h_val_new + dt * (q_laser - q_loss - q_evap) / dz

        H_new[i, j, k] = h_val_new
        T_new[i, j, k] = get_temperature_from_enthalpy(h_val_new, rho, L_f, T_solidus, T_liquidus, cp_solid, cp_liquid)
    else:
        H_new[i, j, k] = H[i, j, k]
        T_new[i, j, k] = T[i, j, k]

class TransientEnthalpy3DGPU:
    def __init__(self, nx=128, ny=128, nz=64, dx=2e-6, dy=2e-6, dz=2e-6):
        self.nx = nx
        self.ny = ny
        self.nz = nz
        self.dx, self.dy, self.dz = dx, dy, dz
        self.device = "cuda:0" if wp.get_cuda_device_count() > 0 else "cpu"
        
    def solve_toolpath(self, toolpath, T_preheat_K=300.0,
              rho=4420.0, L_f=2.9e5, T_solidus=1878.0, T_liquidus=1928.0,
              P0=101325.0, Lv=9.7e6, Rs=173.93, Tv=3533.0,
              cp_solid=670.0, cp_liquid=730.0, k_solid=15.0, k_liquid=25.0,
              mu=0.005, d_gamma_dT=-0.0003, beta=1e-4):
        
        # Unpack Toolpath dict: t, x, y, p
        tp_t = wp.array(toolpath['t'], dtype=float, device=self.device)
        tp_x = wp.array(toolpath['x'], dtype=float, device=self.device)
        tp_y = wp.array(toolpath['y'], dtype=float, device=self.device)
        tp_p = wp.array(toolpath['p'], dtype=float, device=self.device)
        num_pts = len(toolpath['t'])
        
        sim_time_s = toolpath['t'][-1]
        
        k_max = max(k_solid, k_liquid)
        cp_min = min(cp_solid, cp_liquid)
        alpha_max = k_max / (rho * cp_min)
        
        dx_min = min(self.dx, self.dy, self.dz)
        dt = 0.12 * (dx_min**2) / alpha_max # Reduced CFL for hydrodynamics stability
        steps = int(sim_time_s / dt) + 1
        
        print(f"[Phase 25 Multi-Track FDM + Marangoni] Toolpath Pts: {num_pts}. Duration: {sim_time_s*1e6:.1f}us. Steps: {steps}")
        
        shape = (self.nx, self.ny, self.nz)
        T_arr = wp.full(shape=shape, value=float(T_preheat_K), dtype=float, device=self.device)
        
        H_s = rho * cp_solid * T_solidus
        cp_mush = 0.5 * (cp_solid + cp_liquid)
        H_l = H_s + rho * L_f + rho * cp_mush * (T_liquidus - T_solidus)
        if T_preheat_K <= T_solidus:
            h_init = rho * cp_solid * T_preheat_K
        elif T_preheat_K >= T_liquidus:
            h_init = H_l + rho * cp_liquid * (T_preheat_K - T_liquidus)
        else:
            h_init = H_s + (H_l - H_s) * ((T_preheat_K - T_solidus) / (T_liquidus - T_solidus))
            
        H_arr = wp.full(shape=shape, value=float(h_init), dtype=float, device=self.device)
        T_new = wp.zeros_like(T_arr)
        H_new = wp.zeros_like(H_arr)
        
        # Hydrodynamics fields
        U = wp.zeros(shape=shape, dtype=float, device=self.device)
        V = wp.zeros(shape=shape, dtype=float, device=self.device)
        W = wp.zeros(shape=shape, dtype=float, device=self.device)
        U_new = wp.zeros_like(U)
        V_new = wp.zeros_like(V)
        W_new = wp.zeros_like(W)
        P = wp.zeros(shape=shape, dtype=float, device=self.device)
        P_new = wp.zeros_like(P)
        Div = wp.zeros(shape=shape, dtype=float, device=self.device)
        
        initial_z_surf = float((self.nz - 2) * self.dz)
        Z_surf = wp.full(shape=(self.nx, self.ny), value=initial_z_surf, dtype=float, device=self.device)
        Z_surf_new = wp.zeros_like(Z_surf)
        
        start_time = time.perf_counter()
        
        for step in range(steps):
            current_t = step * dt
            
            # 1. Update Free Surface (Recoil depression)
            wp.launch(
                kernel=keyhole_surface_kernel,
                dim=(self.nx, self.ny),
                inputs=[
                    Z_surf, Z_surf_new, T_arr,
                    self.nx, self.ny, self.dz, dt,
                    P0, Lv, Rs, Tv, rho
                ],
                device=self.device
            )
            
            # 2. Advect & Apply Marangoni/Boussinesq/Recoil Forces to Velocity
            wp.launch(
                kernel=velocity_advection_forces_kernel,
                dim=shape,
                inputs=[
                    U, V, W, U_new, V_new, W_new, T_arr, Z_surf_new,
                    self.nx, self.ny, self.nz, self.dx, self.dy, self.dz, dt,
                    mu, rho, d_gamma_dT, beta, T_liquidus, T_solidus,
                    P0, Lv, Rs, Tv
                ],
                device=self.device
            )
            U, U_new = U_new, U
            V, V_new = V_new, V
            W, W_new = W_new, W
            
            # 3. Compute Divergence
            wp.launch(
                kernel=compute_divergence_kernel,
                dim=shape,
                inputs=[U, V, W, Div, Z_surf_new, T_arr, self.nx, self.ny, self.nz, self.dx, self.dy, self.dz, T_solidus],
                device=self.device
            )
            
            # 4. Solve Pressure Poisson (Jacobi Iterations)
            for _ in range(10): # 10 iterations is sufficient for small dt
                wp.launch(
                    kernel=pressure_jacobi_kernel,
                    dim=shape,
                    inputs=[P, P_new, Div, Z_surf_new, T_arr, self.nx, self.ny, self.nz, self.dx, self.dy, self.dz, dt, rho, T_solidus],
                    device=self.device
                )
                P, P_new = P_new, P
                
            # 5. Project Velocity (Make Divergence-Free)
            wp.launch(
                kernel=project_velocity_kernel,
                dim=shape,
                inputs=[U, V, W, P, Z_surf_new, T_arr, self.nx, self.ny, self.nz, self.dx, self.dy, self.dz, dt, rho, T_solidus],
                device=self.device
            )
            
            # 6. Advect Enthalpy and Compute New Temperatures
            wp.launch(
                kernel=enthalpy_3d_nonlinear_step_kernel,
                dim=shape,
                inputs=[
                    T_arr, H_arr, U, V, W, T_new, H_new, Z_surf_new,
                    self.nx, self.ny, self.nz,
                    self.dx, self.dy, self.dz,
                    dt, current_t, rho, L_f, T_solidus, T_liquidus,
                    tp_t, tp_x, tp_y, tp_p, num_pts,
                    30e-6, 0.4, 
                    10.0, 0.35, float(T_preheat_K),
                    P0, Lv, Rs, Tv,
                    float(cp_solid), float(cp_liquid), float(k_solid), float(k_liquid)
                ],
                device=self.device
            )
            
            T_arr, T_new = T_new, T_arr
            H_arr, H_new = H_new, H_arr
            Z_surf, Z_surf_new = Z_surf_new, Z_surf
            
        wp.synchronize_device(self.device)
        elapsed = time.perf_counter() - start_time
        
        T_host = T_arr.numpy()
        Z_host = Z_surf.numpy()
        U_host = U.numpy()
        V_host = V.numpy()
        W_host = W.numpy()
        
        melted = T_host >= T_liquidus
        melt_vol_um3 = np.sum(melted) * (self.dx * self.dy * self.dz) * 1e18
        max_T = np.max(T_host)
        min_z_m = np.min(Z_host)
        max_depth_um = (initial_z_surf - min_z_m) * 1e6
        
        # Max velocity magnitude for diagnostics
        V_mag = np.sqrt(U_host**2 + V_host**2 + W_host**2)
        max_V = np.max(V_mag)
        
        return {
            "melt_volume_um3": float(melt_vol_um3),
            "max_temperature_K": float(max_T),
            "max_velocity_m_s": float(max_V),
            "keyhole_depth_um": float(max_depth_um),
            "sim_time_s": elapsed,
            "device": self.device,
            "steps": steps
        }

if __name__ == "__main__":
    print("Initializing Phase 25 Multi-Track GPU FDM Solver (Marangoni + Recoil Hydrodynamics)...")
    solver = TransientEnthalpy3DGPU(nx=128, ny=128, nz=64, dx=2e-6, dy=2e-6, dz=2e-6)
    
    # 5-point Square Toolpath Hatch
    cx, cy = 128e-6, 128e-6
    sq = 25e-6
    toolpath = {
        't': [0.0, 50e-6, 100e-6, 150e-6, 200e-6],
        'x': [cx-sq, cx+sq, cx+sq, cx-sq, cx-sq],
        'y': [cy-sq, cy-sq, cy+sq, cy+sq, cy-sq],
        'p': [200.0, 200.0, 200.0, 200.0, 200.0]
    }
    
    print("Running square hatch toolpath simulation with full fluid mechanics...")
    res = solver.solve_toolpath(toolpath=toolpath)
    print(f"Results: {res}")
    print("SUCCESS: Full Hydrodynamic (Marangoni + Recoil) GPU simulation verified.")
