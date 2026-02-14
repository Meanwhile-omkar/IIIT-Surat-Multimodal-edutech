from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

from app.core.config import DATABASE_URL

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Initialize database tables and seed default data."""
    from app.models.schemas import Student

    Base.metadata.create_all(bind=engine)

    # Seed default student for single-user demo mode
    db = SessionLocal()
    try:
        existing_student = db.query(Student).filter(Student.id == 1).first()
        if not existing_student:
            default_student = Student(id=1, name="Demo User")
            db.add(default_student)
            db.commit()
            print("[OK] Created default student (ID: 1, Name: Demo User)")
        else:
            print("[OK] Default student already exists")
    except Exception as e:
        print(f"[WARN] Error seeding default student: {e}")
        db.rollback()
    finally:
        db.close()
