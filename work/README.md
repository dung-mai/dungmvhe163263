# work/

One folder per feature, created by `scripts/ai/new-feature.sh <slug> "<request>"`.

```
work/<feature>/
  brief.md       lane 0 intake
  spec.md        lane 1 define      -> G1
  design.md      lane 2 design      -> G2
  plan.md        lane 2 design
  test-plan.md   lane 3 test-plan (parallel with build)
  review.md      lane 4 verify
  security.md    lane 4 security (risk-based)
  pr.md          lane 4 create-pr   -> G3
  status.md      handoff, always current
  evidence/      screenshots, videos
  logs/          headless run logs (git-ignored)
```

Commit the artifacts with the code: they are the memory that lets any tool or model continue.
