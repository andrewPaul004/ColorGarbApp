# Page snapshot

```yaml
- main [ref=e3]:
  - generic [ref=e4]:
    - generic [ref=e5]:
      - img [ref=e6]
      - heading "ColorGarb Client Portal" [level=1] [ref=e8]
      - paragraph [ref=e9]: Sign in to access your costume orders
    - generic [ref=e12]:
      - generic [ref=e13]:
        - generic [ref=e14]:
          - text: Email Address
          - generic [ref=e15]: "*"
        - generic [ref=e16]:
          - img [ref=e17]
          - textbox "Email Address" [active] [ref=e19]
          - group:
            - generic: Email Address *
      - generic [ref=e20]:
        - generic [ref=e21]:
          - text: Password
          - generic [ref=e22]: "*"
        - generic [ref=e23]:
          - img [ref=e24]
          - textbox "Password" [ref=e26]
          - group:
            - generic: Password *
      - button "Sign In" [ref=e27] [cursor=pointer]
      - separator [ref=e28]
      - button "Forgot your password?" [ref=e30] [cursor=pointer]
    - paragraph [ref=e32]:
      - text: Need help? Contact
      - link "support@colorgarb.com" [ref=e33] [cursor=pointer]:
        - /url: mailto:support@colorgarb.com
```