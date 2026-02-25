# BudgetWise - Use Case Diagram

```mermaid
graph LR

    U((User))
    SF([Supabase Auth])

    subgraph BudgetWise_System["BudgetWise System"]
        UC1(Login / Signup)
        UC2(Add Expense)
        UC3(Track Budget)
        UC4(View Summary)
        UC5(Manage Goals)
        UC6(Receive Overspent Alert)
    end

    U --> UC1
    U --> UC2
    U --> UC4
    U --> UC5
    
    UC2 -.-> UC3 : "includes"
    UC3 -.-> UC6 : "extends"
    
    UC1 -.-> SF : "verifies with"
```

