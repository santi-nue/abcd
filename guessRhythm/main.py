from ortools.linear_solver import pywraplp
import json
import sys




def solve(dhat, arrayOfDurations, signature):
    solver = pywraplp.Solver.CreateSolver("SAT") #Mixed-integer linear programming
    
    if not solver:
        return

    inf = solver.infinity()
    
    n = len(dhat)
    booleanVars = []

    for i in range(n):
        booleanVars.append([])
        for duration in arrayOfDurations[i]:
            booleanVars[i].append(solver.IntVar(0, 1, "d" + str(i) + "_" + str(duration)))

    print("Number of variables =", solver.NumVariables())


    for i in range(n):
        ct = solver.Constraint(1, 1, "di")
        for j in range(len(arrayOfDurations[i])):
            ct.SetCoefficient(booleanVars[i][j], 1)

    def addDi(ct, i, coeff):
        for j in range(len(arrayOfDurations[i])):
            ct.SetCoefficient(booleanVars[i][j], coeff*arrayOfDurations[i][j])

    ct = solver.Constraint(signature, signature, "total duration")
    for i in range(n):
        addDi(ct, i, 1)

    

    print("Number of constraints =", solver.NumConstraints())

    # Create the objective function, 3 * x + y.
    objective = solver.Objective()
    objective.SetMinimization()

    for i in range(n):
        for j in range(n):
            if i != j and dhat[i] >= dhat[j]:
                errorVar = solver.NumVar(0, inf, "error when di is smaller than dj")
                ct = solver.Constraint(0, inf, "di is generally greater than dj")
                addDi(ct, i, 1)
                addDi(ct, j, -1)
                ct.SetCoefficient(errorVar, 1)
                objective.SetCoefficient(errorVar, 1)


    print(f"Solving with {solver.SolverVersion()}")
    solver.Solve()

    print("Solution:")
    print("Objective value =", objective.Value())

    d = []
    for i in range(n):
        for j in range(len(arrayOfDurations[i])):
            if booleanVars[i][j].solution_value() == 1:
                d.append(arrayOfDurations[i][j])

    return d



def main():
    arg = sys.argv[1].replace('\\', '')  
    print(arg)
    input = json.loads(arg)
    print(solve(input["dhats"], input["possibleDurations"], input["signature"]))

if __name__ == "__main__":
    main()