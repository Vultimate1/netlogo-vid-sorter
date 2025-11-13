import * as XLSX from 'xlsx';
import emailjs from '@emailjs/browser';
import { Button, Typography, Container, Box, Dialog, DialogTitle, DialogContent, TextField, DialogActions } from '@mui/material';
import React, { useState, useEffect, useRef } from 'react';

const SERVICE_ID = 'YOUR_SERVICE_ID';
const TEMPLATE_ID = 'YOUR_TEMPLATE_ID';
const PUBLIC_KEY = 'YOUR_PUBLIC_KEY';

const EmailFormModal = ({ open, handleClose }) => {
    const form = useRef();
    const [isSending, setIsSending] = useState(false);
    const sendEmail = (e) => {
      e.preventDefault();
      setIsSending(true);
      emailjs.sendForm(SERVICE_ID, TEMPLATE_ID, form.current, PUBLIC_KEY)
      .then((result) => {
          alert('SUCCESS!');
          handleClose();
      }, (error) => {
          alert('FAILED...', error.text);
      })
      .finally(() => {
          setIsSending(false);
      });

    };

return (
    <Dialog open={open} onClose={handleClose}>
      <DialogTitle>Send Us a Message</DialogTitle>
      <form ref={form} onSubmit={sendEmail}>
        <DialogContent>
          {/* Note: The 'name' attribute is crucial for emailjs.sendForm() */}
          <TextField
            autoFocus
            margin="dense"
            label="Your Name"
            type="text"
            fullWidth
            variant="standard"
            name="from_name" // Matches the EmailJS template variable
            required
          />
          <TextField
            margin="dense"
            label="Your Email"
            type="email"
            fullWidth
            variant="standard"
            name="from_email" // Matches the EmailJS template variable
            required
          />
          <TextField
            margin="dense"
            label="Message"
            type="text"
            fullWidth
            multiline
            rows={4}
            variant="standard"
            name="message" // Matches the EmailJS template variable
            required
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button type="submit" disabled={isSending}>
            {isSending ? 'Sending...' : 'Send'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default EmailFormModal;