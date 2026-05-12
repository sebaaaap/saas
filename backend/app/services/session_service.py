from decimal import Decimal
"""
Servicio de Sesiones de Caja
Maneja apertura, cierre y arqueo de caja
"""
from app.db.tenant_session import TenantSession
from datetime import datetime
from typing import List, Optional, Union
from fastapi import HTTPException
from uuid import UUID

from app.models.base import CashSession, CashRegister, Ticket, SaleState, Expense
from app.schemas.sessions import CashSessionCreate, CashSessionClose, CashRegisterCreate

class SessionService:
    """Servicio de gestión de sesiones de caja"""
    
    # --- Cash Register Methods ---
    @staticmethod
    def create_register(db: TenantSession, data: CashRegisterCreate) -> CashRegister:
        register = CashRegister(**data.model_dump())
        db.add(register)
        db.commit()
        db.refresh(register)
        return register

    @staticmethod
    def update_register(db: TenantSession, register_id: UUID, data: CashRegisterCreate) -> CashRegister:
        register = db.tenant_query(CashRegister).filter(CashRegister.id == register_id).first()
        if not register:
            raise HTTPException(status_code=404, detail="Caja no encontrada")
        
        for key, value in data.model_dump().items():
            setattr(register, key, value)
            
        db.commit()
        db.refresh(register)
        return register

    @staticmethod
    def delete_register(db: TenantSession, register_id: UUID) -> bool:
        register = db.tenant_query(CashRegister).filter(CashRegister.id == register_id).first()
        if not register:
            raise HTTPException(status_code=404, detail="Caja no encontrada")
        
        # Soft delete
        register.is_active = False
        db.commit()
        return True

    @staticmethod
    def list_registers(db: TenantSession, active_only: bool = True, branch_id: Optional[UUID] = None) -> List[CashRegister]:
        query = db.tenant_query(CashRegister)
        if active_only:
            query = query.filter(CashRegister.is_active == True)
        if branch_id:
            query = query.filter(CashRegister.branch_id == branch_id)
        return query.all()

    @staticmethod
    def get_available_registers(db: TenantSession, branch_id: Optional[UUID] = None) -> List[CashRegister]:
        """Listar cajas que no tienen una sesión abierta actualmente"""
        active_sessions = db.tenant_query(CashSession.cash_register_id).filter(CashSession.status == "open").all()
        occupied_ids = [s[0] for s in active_sessions]
        query = db.tenant_query(CashRegister).filter(
            CashRegister.is_active == True,
            ~CashRegister.id.in_(occupied_ids)
        )
        if branch_id:
            query = query.filter(CashRegister.branch_id == branch_id)
        return query.all()

    # --- Session Methods ---
    @staticmethod
    def open_session(db: TenantSession, session_data: CashSessionCreate) -> CashSession:
        """
        Abre una nueva sesión de caja vinculada a una terminal física.
        """
        # 1. Verificar si el usuario ya tiene una sesión abierta
        existing_user_session = db.tenant_query(CashSession).filter(
            CashSession.user_id == session_data.user_id,
            CashSession.status == "open"
        ).first()
        
        if existing_user_session:
            raise HTTPException(
                status_code=400,
                detail=f"Ya tienes una sesión abierta. Ciérrala antes de abrir una nueva."
            )
        
        # 2. Verificar si la caja ya está ocupada
        existing_register_session = db.tenant_query(CashSession).filter(
            CashSession.cash_register_id == session_data.cash_register_id,
            CashSession.status == "open"
        ).first()

        if existing_register_session:
            raise HTTPException(
                status_code=400,
                detail="Esta caja ya está siendo utilizada por otro usuario."
            )

        # 3. Crear sesión
        session = CashSession(
            user_id=session_data.user_id,
            cash_register_id=session_data.cash_register_id,
            opening_balance=session_data.opening_balance,
            expected_balance=session_data.opening_balance,
            status="open",
            opened_at=datetime.utcnow(),
            notes=session_data.notes
        )
        
        db.add(session)
        db.commit()
        db.refresh(session)
        return session
    
    @staticmethod
    def close_session(db: TenantSession, session_id: UUID, close_data: CashSessionClose) -> CashSession:
        """
        Cierra una sesión de caja y realiza el arqueo.
        """
        session = db.tenant_query(CashSession).filter(CashSession.id == session_id).first()
        if not session:
            raise HTTPException(status_code=404, detail="Sesión no encontrada")
        if session.status == "closed":
            raise HTTPException(status_code=400, detail="La sesión ya está cerrada")
        
        # 1. Sincronizar Totales de Sesión
        # Recalculamos los totales basados en los tickets para asegurar integridad
        session.total_sales_cash = Decimal('0.00')
        session.total_sales_card = Decimal('0.00')
        session.total_sales_transfer = Decimal('0.00')
        
        session_tickets = db.tenant_query(Ticket).filter(
            Ticket.session_id == session_id,
            Ticket.state.in_([SaleState.VALIDATED, SaleState.PAID, SaleState.REFUNDED])
        ).all()
        
        for t in session_tickets:
            for p in t.payments:
                pm_name = p.payment_method.name if hasattr(p.payment_method, "name") else str(p.payment_method).upper()
                if "CASH" in pm_name or "EFECTIVO" in pm_name:
                    session.total_sales_cash += p.amount
                elif "CARD" in pm_name or "TARJETA" in pm_name:
                    session.total_sales_card += p.amount
                elif "TRANSFER" in pm_name or "TRANSFERENCIA" in pm_name:
                    session.total_sales_transfer += p.amount
        
        # 2. Sumar y descontar Gastos (Expenses)
        session_expenses = db.tenant_query(Expense).filter(Expense.session_id == session_id).all()
        total_expenses_cash = Decimal('0.00')
        
        for exp in session_expenses:
            pm = str(exp.payment_method).upper()
            if "CASH" in pm or "EFECTIVO" in pm:
                total_expenses_cash += Decimal(str(exp.amount))
        
        # 3. Finalizar Sesión
        expected_balance = session.opening_balance + session.total_sales_cash - total_expenses_cash
        session.expected_balance = expected_balance
        session.closing_balance = close_data.closing_balance
        session.difference = close_data.closing_balance - expected_balance
        
        session.closed_at = datetime.utcnow()
        session.status = "closed"
        if close_data.notes:
            session.notes = (session.notes or "") + "\nCierre: " + close_data.notes
        
        db.commit()
        db.refresh(session)
        return session
    
    @staticmethod
    def get_open_session(db: TenantSession, user_id: Optional[str] = None, branch_id: Optional[UUID] = None) -> Optional[CashSession]:
        """Obtiene la sesión abierta actual, filtrada opcionalmente por sucursal"""
        query = db.tenant_query(CashSession).filter(CashSession.status == "open")
        if user_id:
            query = query.filter(CashSession.user_id == user_id)
        if branch_id:
            query = query.join(CashRegister).filter(CashRegister.branch_id == branch_id)
        return query.first()
    
    @staticmethod
    def get_session_by_id(db: TenantSession, session_id: UUID) -> Optional[CashSession]:
        return db.tenant_query(CashSession).filter(CashSession.id == session_id).first()
    
    @staticmethod
    def get_all_sessions(db: TenantSession, skip: int = 0, limit: int = 100) -> List[CashSession]:
        return db.tenant_query(CashSession).order_by(CashSession.opened_at.desc()).offset(skip).limit(limit).all()
