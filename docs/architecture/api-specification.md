# API Specification

## REST API Specification

```yaml
openapi: 3.0.0
info:
  title: ColorGarb Client Portal API
  version: 1.0.0
  description: RESTful API for costume order management and client communication
servers:
  - url: https://api.colorgarb.com/v1
    description: Production API server
  - url: https://staging-api.colorgarb.com/v1
    description: Staging environment

security:
  - BearerAuth: []

paths:
  /auth/login:
    post:
      summary: User authentication
      tags: [Authentication]
      security: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [email, password]
              properties:
                email:
                  type: string
                  format: email
                password:
                  type: string
      responses:
        '200':
          description: Authentication successful
          content:
            application/json:
              schema:
                type: object
                properties:
                  token:
                    type: string
                  expiresIn:
                    type: integer
                  user:
                    $ref: '#/components/schemas/User'

  /orders:
    get:
      summary: Get orders for user's organization
      tags: [Orders]
      parameters:
        - name: status
          in: query
          schema:
            type: string
            enum: [Active, Completed, Cancelled]
        - name: stage
          in: query
          schema:
            $ref: '#/components/schemas/OrderStage'
      responses:
        '200':
          description: List of orders
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Order'

  /orders/{orderId}:
    get:
      summary: Get order details
      tags: [Orders]
      parameters:
        - name: orderId
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        '200':
          description: Order details
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/OrderDetail'

    patch:
      summary: Update order stage (ColorGarb staff only)
      tags: [Orders]
      parameters:
        - name: orderId
          in: path
          required: true
          schema:
            type: string
            format: uuid
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                stage:
                  $ref: '#/components/schemas/OrderStage'
                shipDate:
                  type: string
                  format: date
                reason:
                  type: string
      responses:
        '200':
          description: Order updated successfully

  /orders/{orderId}/measurements:
    get:
      summary: Get measurements for order
      tags: [Measurements]
      parameters:
        - name: orderId
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        '200':
          description: List of measurements
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Measurement'

    post:
      summary: Submit measurements
      tags: [Measurements]
      parameters:
        - name: orderId
          in: path
          required: true
          schema:
            type: string
            format: uuid
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: array
              items:
                $ref: '#/components/schemas/MeasurementSubmission'
      responses:
        '201':
          description: Measurements submitted successfully

  /orders/{orderId}/payments:
    get:
      summary: Get payment history
      tags: [Payments]
      parameters:
        - name: orderId
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        '200':
          description: Payment history
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Payment'

    post:
      summary: Process payment
      tags: [Payments]
      parameters:
        - name: orderId
          in: path
          required: true
          schema:
            type: string
            format: uuid
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/PaymentRequest'
      responses:
        '201':
          description: Payment processed successfully

  /orders/{orderId}/messages:
    get:
      summary: Get order messages
      tags: [Messages]
      parameters:
        - name: orderId
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        '200':
          description: Message thread
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Message'

    post:
      summary: Send message
      tags: [Messages]
      parameters:
        - name: orderId
          in: path
          required: true
          schema:
            type: string
            format: uuid
      requestBody:
        required: true
        content:
          multipart/form-data:
            schema:
              type: object
              required: [content]
              properties:
                content:
                  type: string
                attachments:
                  type: array
                  items:
                    type: string
                    format: binary
      responses:
        '201':
          description: Message sent successfully

components:
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

  schemas:
    User:
      type: object
      properties:
        id:
          type: string
          format: uuid
        email:
          type: string
          format: email
        firstName:
          type: string
        lastName:
          type: string
        role:
          type: string
          enum: [Director, Finance, ColorGarbStaff]
        organizationId:
          type: string
          format: uuid

    Order:
      type: object
      properties:
        id:
          type: string
          format: uuid
        orderNumber:
          type: string
        description:
          type: string
        currentStage:
          $ref: '#/components/schemas/OrderStage'
        originalShipDate:
          type: string
          format: date
        currentShipDate:
          type: string
          format: date
        totalAmount:
          type: number
          format: decimal
        status:
          type: string
          enum: [Active, Completed, Cancelled]

    OrderStage:
      type: string
      enum:
        - DesignProposal
        - ProofApproval
        - Measurements
        - ProductionPlanning
        - Cutting
        - Sewing
        - QualityControl
        - Finishing
        - FinalInspection
        - Packaging
        - ShippingPreparation
        - ShipOrder
        - Delivery

    OrderDetail:
      allOf:
        - $ref: '#/components/schemas/Order'
        - type: object
          properties:
            organization:
              $ref: '#/components/schemas/Organization'
            stageHistory:
              type: array
              items:
                $ref: '#/components/schemas/StageHistory'
            nextActions:
              type: array
              items:
                type: string

    Organization:
      type: object
      properties:
        id:
          type: string
          format: uuid
        name:
          type: string
        type:
          type: string
          enum: [School, BoosterClub, Other]
        contactEmail:
          type: string
          format: email

    Measurement:
      type: object
      properties:
        id:
          type: string
          format: uuid
        performerName:
          type: string
        measurements:
          type: object
          additionalProperties:
            type: number
        suggestedSize:
          type: string
        status:
          type: string
          enum: [Submitted, Mapped, Approved, Rejected]

    MeasurementSubmission:
      type: object
      required: [performerName, measurements]
      properties:
        performerName:
          type: string
        measurements:
          type: object
          additionalProperties:
            type: number

    Payment:
      type: object
      properties:
        id:
          type: string
          format: uuid
        amount:
          type: number
          format: decimal
        method:
          type: string
          enum: [CreditCard, ACH, Check, PurchaseOrder]
        status:
          type: string
          enum: [Pending, Approved, Completed, Failed, Refunded]
        processedAt:
          type: string
          format: date-time

    PaymentRequest:
      type: object
      required: [amount, method]
      properties:
        amount:
          type: number
          format: decimal
        method:
          type: string
          enum: [CreditCard, ACH, PurchaseOrder]
        purchaseOrderNumber:
          type: string
        paymentDetails:
          type: object

    Message:
      type: object
      properties:
        id:
          type: string
          format: uuid
        content:
          type: string
        senderName:
          type: string
        senderRole:
          type: string
        sentAt:
          type: string
          format: date-time
        attachments:
          type: array
          items:
            type: object
            properties:
              filename:
                type: string
              url:
                type: string

    StageHistory:
      type: object
      properties:
        stage:
          $ref: '#/components/schemas/OrderStage'
        enteredAt:
          type: string
          format: date-time
        updatedBy:
          type: string
        notes:
          type: string
```
