package verification

import (
	"context"
	"testing"
)

func TestFakeSenderRecordsDeterministicMessages(t *testing.T) {
	sender := NewFakeSender()
	message := Message{
		Channel:     ChannelEmail,
		Destination: "wife@example.com",
		Template:    "identity-change",
	}

	if err := sender.Send(context.Background(), message); err != nil {
		t.Fatal(err)
	}
	messages := sender.Sent()
	if len(messages) != 1 || messages[0] != message {
		t.Fatalf("recorded messages = %#v, want %#v", messages, []Message{message})
	}

	messages[0].Destination = "mutated@example.com"
	if sender.Sent()[0].Destination != "wife@example.com" {
		t.Fatal("Sent must return a defensive copy")
	}
}

func TestNotifyContactChangeNotifiesOldAndNewEmail(t *testing.T) {
	sender := NewFakeSender()
	before := Contacts{Email: "old@example.com", Phone: "+358401111111"}
	after := Contacts{Email: "new@example.com", Phone: "+358401111111"}

	if err := NotifyContactChange(context.Background(), sender, before, after); err != nil {
		t.Fatal(err)
	}
	messages := sender.Sent()
	if len(messages) != 2 {
		t.Fatalf("message count = %d, want 2", len(messages))
	}
	if messages[0].Destination != before.Email || messages[1].Destination != after.Email {
		t.Fatalf("email change destinations = %#v", messages)
	}
}

func TestNotifyContactChangeNotifiesOldAndNewPhone(t *testing.T) {
	sender := NewFakeSender()
	before := Contacts{Email: "wife@example.com", Phone: "+358401111111"}
	after := Contacts{Email: "wife@example.com", Phone: "+358402222222"}

	if err := NotifyContactChange(context.Background(), sender, before, after); err != nil {
		t.Fatal(err)
	}
	messages := sender.Sent()
	if len(messages) != 2 {
		t.Fatalf("message count = %d, want 2", len(messages))
	}
	if messages[0].Destination != before.Phone || messages[1].Destination != after.Phone {
		t.Fatalf("phone change destinations = %#v", messages)
	}
}
