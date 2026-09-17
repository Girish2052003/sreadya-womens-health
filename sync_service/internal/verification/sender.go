package verification

import "context"

type Channel string

const (
	ChannelEmail Channel = "email"
	ChannelPhone Channel = "phone"
)

type Message struct {
	Channel     Channel
	Destination string
	Template    string
}

// VerificationSender is the deployment-neutral delivery boundary. Task 21
// intentionally provides no production email/SMS vendor implementation.
type VerificationSender interface {
	Send(context.Context, Message) error
}

type Contacts struct {
	Email string
	Phone string
}

// NotifyContactChange alerts both the old and new destination when a verified
// account contact changes. Ordering is deterministic for auditability.
func NotifyContactChange(ctx context.Context, sender VerificationSender, before, after Contacts) error {
	if before.Email != after.Email {
		if before.Email != "" {
			if err := sender.Send(ctx, Message{Channel: ChannelEmail, Destination: before.Email, Template: "contact-change"}); err != nil {
				return err
			}
		}
		if after.Email != "" {
			if err := sender.Send(ctx, Message{Channel: ChannelEmail, Destination: after.Email, Template: "contact-change"}); err != nil {
				return err
			}
		}
	}
	if before.Phone != after.Phone {
		if before.Phone != "" {
			if err := sender.Send(ctx, Message{Channel: ChannelPhone, Destination: before.Phone, Template: "contact-change"}); err != nil {
				return err
			}
		}
		if after.Phone != "" {
			if err := sender.Send(ctx, Message{Channel: ChannelPhone, Destination: after.Phone, Template: "contact-change"}); err != nil {
				return err
			}
		}
	}
	return nil
}
