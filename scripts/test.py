from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import math


class CalcRequest(BaseModel):
    op: str
    a: float
    b: float | None = None


app = FastAPI()


@app.post("/calc")
def calc(req: CalcRequest):
    op = req.op
    a = req.a
    b = req.b
    if op == "add":
        return {"result": a + (b or 0)}
    if op == "sub":
        return {"result": a - (b or 0)}
    if op == "mul":
        return {"result": a * (b or 0)}
    if op == "div":
        if b == 0:
            raise HTTPException(status_code=400, detail="Division by zero")
        return {"result": a / b}
    if op == "pow":
        return {"result": a ** (b or 1)}
    if op == "sqrt":
        if a < 0:
            raise HTTPException(status_code=400, detail="sqrt of negative number")
        return {"result": math.sqrt(a)}
    raise HTTPException(status_code=400, detail="Unknown operation")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8001)
